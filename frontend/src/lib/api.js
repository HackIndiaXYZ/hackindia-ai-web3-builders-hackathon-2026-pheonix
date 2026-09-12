// Keep browser requests same-origin. In development Vite proxies /api to
// Flask; in production Flask serves /api itself. This avoids a CORS failure
// when the dev server is opened at 127.0.0.1:5173 instead of localhost:5173.
export const API_BASE = "/api";

export function authHeaders(token) {
  return token ? { Authorization: "Bearer " + token } : {};
}

// Set by useAuth so any 401 can clear the stale session exactly once, rather
// than every caller having to handle it. Backend sessions live in memory, so
// a server restart invalidates a token the browser still has in
// localStorage — previously the UI kept showing you as a logged-in Registrar
// while every write failed.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, options, token) {
  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch {
    // fetch() rejects only on network-level failure, which here almost always
    // means the backend isn't running. Say so, instead of "Failed to fetch".
    throw new Error(
      "Cannot reach the backend. Is it running? Start it with: cd backend && python app.py"
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (a proxy error page, an empty 500).
    if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
    return null;
  }

  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    const err = new Error(data?.error || `Request failed (HTTP ${res.status})`);
    err.status = res.status;
    // Carry structured payload through to the UI — the overlap refusal, for
    // instance, ships the geometry so the error can be drawn, not just read.
    if (data?.geometry) err.geometry = data.geometry;
    throw err;
  }
  return data;
}

export async function apiGet(path, token) {
  return request(path, { headers: authHeaders(token) }, token);
}

export async function apiPost(path, body, token, isForm = false) {
  return request(
    path,
    {
      method: "POST",
      headers: isForm
        ? authHeaders(token)
        : { "Content-Type": "application/json", ...authHeaders(token) },
      body: isForm ? body : JSON.stringify(body),
    },
    token
  );
}

export async function login(username, role) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, role }),
  });
}

export async function currentSession(token) {
  return apiGet("/auth/me", token);
}

export async function logout(token) {
  return apiPost("/auth/logout", {}, token);
}
