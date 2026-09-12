"""Username ⇄ user UUID resolution.

The runtime speaks in display names — `request.session["username"]` is
`"Rajesh Kumar"`, transfers carry `sellers: ["Rajesh Kumar", ...]`, and the API
returns those names verbatim. The operational schema keys everything on
`users.id UUID`. `users.identity_reference TEXT UNIQUE` is the bridge, and this
module owns the mapping in both directions.

Two rules make the mapping stable:

  * **`identity_reference` is the canonical, case-folded form** — lowercased
    with internal whitespace collapsed. `UNIQUE` on TEXT is case-sensitive in
    PostgreSQL, so storing the display name there would let "Rajesh Kumar" and
    "rajesh kumar" become two different owners of the same parcel.
  * **`users.display_name` carries the presentation form** (added in migration
    002). Without it the API would start returning `"rajesh kumar"` where it
    previously returned `"Rajesh Kumar"`, which is a user-facing change the
    brief forbids.

A username→UUID mapping never changes once the row exists, so it caches well.
Cache writes happen only on the plain read path: `resolve_or_create` reads
uncommitted rows inside its caller's transaction, and caching one of those
would leave a UUID for a row that a rollback removed.
"""

import cache

#: A username→UUID mapping is immutable, so this can be generous. It is still
#: bounded rather than infinite so that a re-seeded database converges.
_CACHE_TTL_SECONDS = 3600


def reference(username):
    """The canonical `identity_reference` for a display name.

    Collapses internal whitespace as well as case, so "Rajesh  Kumar" and
    "rajesh kumar" resolve to the same identity.
    """
    return " ".join((username or "").split()).lower()


def display_form(username):
    """The presentation form to store in `users.display_name`."""
    return " ".join((username or "").split())


def _cache_key(ref):
    return f"identity:ref:{ref}"


def _select(cur, ref):
    cur.execute("SELECT id::text FROM users WHERE identity_reference=%s", (ref,))
    row = cur.fetchone()
    return row[0] if row else None


def resolve(cur, username):
    """The user's UUID as a string, or None if the identity is unknown.

    Safe to cache from: this only ever reads rows the caller's transaction did
    not create.
    """
    ref = reference(username)
    if not ref:
        return None
    cached = cache.cached_get(_cache_key(ref))
    if cached:
        return cached
    user_id = _select(cur, ref)
    if user_id:
        cache.cached_set(_cache_key(ref), user_id, _CACHE_TTL_SECONDS)
    return user_id


def require(cur, username):
    """Like `resolve`, but raises instead of returning None.

    KeyError because `app.py` already maps it to a 404 — an unknown identity is
    a missing entity, not a malformed request.
    """
    user_id = resolve(cur, username)
    if not user_id:
        raise KeyError(f"identity is not provisioned: {username}")
    return user_id


def resolve_or_create(cur, username, roles=()):
    """The user's UUID, provisioning the row if this identity is new.

    Used by the seeder and by any flow that must record an owner of record who
    has never logged in (most parcels in the demo data are like this: an owner
    name with no credential behind it). Deliberately does not touch the cache —
    see the module docstring.
    """
    ref = reference(username)
    if not ref:
        raise ValueError("username is required")
    cur.execute(
        """INSERT INTO users(identity_reference, display_name) VALUES (%s,%s)
           ON CONFLICT(identity_reference) DO UPDATE
             SET display_name = COALESCE(users.display_name, EXCLUDED.display_name),
                 updated_at = now()
           RETURNING id::text""",
        (ref, display_form(username)),
    )
    user_id = cur.fetchone()[0]
    for role in roles:
        cur.execute(
            "INSERT INTO user_roles(user_id, role_code) VALUES (%s,%s) ON CONFLICT DO NOTHING",
            (user_id, role),
        )
    return user_id


def name_of(cur, user_id):
    """The display name for a UUID, falling back to the canonical reference.

    The fallback matters for rows created before migration 002 or by a path
    that had no display form to record.
    """
    if not user_id:
        return None
    cur.execute(
        "SELECT COALESCE(display_name, identity_reference) FROM users WHERE id=%s",
        (user_id,),
    )
    row = cur.fetchone()
    return row[0] if row else None


def names_of(cur, user_ids):
    """`{uuid: display name}` for several users in one round trip."""
    ids = [uid for uid in dict.fromkeys(user_ids) if uid]
    if not ids:
        return {}
    cur.execute(
        "SELECT id::text, COALESCE(display_name, identity_reference) FROM users WHERE id = ANY(%s)",
        (ids,),
    )
    return {row[0]: row[1] for row in cur.fetchall()}


def forget(username):
    """Drop a cached mapping. Called when an identity row is rewritten."""
    ref = reference(username)
    if ref:
        cache.cached_delete(_cache_key(ref))
