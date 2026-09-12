import { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE = "http://localhost:5000/api";

// ---------------------------------------------------------------- API ----

function authHeaders(token) {
  return token ? { Authorization: "Bearer " + token } : {};
}

async function apiGet(path, token) {
  const res = await fetch(API_BASE + path, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function apiPost(path, body, token, isForm = false) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: isForm ? authHeaders(token) : { "Content-Type": "application/json", ...authHeaders(token) },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// --------------------------------------------------------------- Auth ----

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("lr_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("lr_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (username, role) => {
    const data = await apiPost("/auth/login", { username, role });
    setToken(data.token);
    setUser({ username: data.username, role: data.role });
    localStorage.setItem("lr_token", data.token);
    localStorage.setItem("lr_user", JSON.stringify({ username: data.username, role: data.role }));
  }, []);

  const logout = useCallback(() => {
    apiPost("/auth/logout", {}, token).catch(() => {});
    setToken(""); setUser(null);
    localStorage.removeItem("lr_token"); localStorage.removeItem("lr_user");
  }, [token]);

  return { token, user, login, logout };
}

// -------------------------------------------------------------- Router ----

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash.slice(1) || "/dashboard");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1) || "/dashboard");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function navigate(path) { window.location.hash = path; }

function parseRoute(route) {
  const parts = route.split("/").filter(Boolean);
  return { path: "/" + (parts[0] || "dashboard"), rest: parts.slice(1).join("/") };
}

// ------------------------------------------------------------- Shared ----

function StatusBadge({ status }) {
  return <span className={"status " + status}>{status.replace("_", " ")}</span>;
}

function EventBadge({ type }) {
  return <span className={"event-badge " + type}>{type.replace(/_/g, " ")}</span>;
}

// -------------------------------------------------------------- NavBar ----

function NavBar({ auth, route }) {
  const links = [
    ["/dashboard", "Dashboard"],
    ["/registry", "Registry"],
    ["/register", "Register Parcel"],
    ["/transfer", "Transfer"],
    ["/chain", "Blockchain Explorer"],
  ];
  return (
    <nav className="topnav">
      <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
        <span className="title">Parcel Register</span>
        <span className="subtitle">Land Title Verification Portal</span>
      </div>
      <div className="navlinks">
        {links.map(([path, label]) => (
          <a key={path} className={route === path ? "active" : ""} onClick={() => navigate(path)}>{label}</a>
        ))}
      </div>
      <div className="authbox">
        {auth.user ? (
          <>
            <span>{auth.user.username}</span>
            <span className="role-pill">{auth.user.role}</span>
            <button onClick={() => { auth.logout(); navigate("/dashboard"); }}>Log out</button>
          </>
        ) : (
          <button className="login-cta" onClick={() => navigate("/login")}>Log in</button>
        )}
      </div>
    </nav>
  );
}

// ------------------------------------------------------------- Login ----

function LoginPage({ auth }) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("REGISTRAR");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await auth.login(username, role);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="pagetitle">Sign in</h1>
      <p className="pagesub">
        This is a demo identity layer standing in for the real one — a production
        deployment authenticates via Aadhaar-linked eSign/DigiLocker, not a role
        picker. What's real here is the architecture: only an authenticated
        Registrar session can register a parcel, commit a transfer, or mint a
        certificate. Anyone can still search and verify without logging in.
      </p>
      <div className="card" style={{ maxWidth: 420 }}>
        <form onSubmit={submit}>
          <label className="field-label">Username</label>
          <input type="text" style={{ width: "100%" }} value={username}
            onChange={e => setUsername(e.target.value)} placeholder="e.g. registrar_noida2" required />

          <label className="field-label">Role</label>
          <select style={{ width: "100%" }} value={role} onChange={e => setRole(e.target.value)}>
            <option value="REGISTRAR">Registrar (can register / commit / mint)</option>
            <option value="BANK">Bank Officer (read-only, deeper due-diligence view)</option>
            <option value="BUYER">Buyer (read-only)</option>
            <option value="AUDITOR">Auditor / Court (read-only, full history)</option>
          </select>

          {error && <div style={{ color: "var(--brick)", fontSize: 13, marginTop: 10 }}>{error}</div>}
          <button type="submit" style={{ marginTop: 16 }}>Sign in</button>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------- Dashboard ----

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [demoResults, setDemoResults] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const loadStats = () => apiGet("/stats").then(setStats).catch(() => {});
  useEffect(() => { loadStats(); }, []);

  const runDemo = async () => {
    setDemoLoading(true);
    try {
      const results = await apiGet("/demo/run-all");
      setDemoResults(results);
      loadStats();
    } finally {
      setDemoLoading(false);
    }
  };

  if (!stats) return <div className="pagesub">Loading…</div>;

  return (
    <div>
      <h1 className="pagetitle">Dashboard</h1>
      <p className="pagesub">Live view of the registry — every number below reflects real data from the backend, updated as you use the portal.</p>

      <div className="grid cols-4">
        <div className="card statcard"><div className="num">{stats.total_parcels}</div><div className="label">Parcels in registry</div></div>
        <div className="card statcard"><div className="num">{stats.total_onchain_events}</div><div className="label">On-chain events</div></div>
        <div className="card statcard"><div className="num">{stats.certificates_minted}</div><div className="label">Certificates minted</div></div>
        <div className="card statcard"><div className="num">{stats.assessments_run}</div><div className="label">Fraud checks run</div></div>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>Risk status breakdown (this session)</h2>
        {stats.assessments_run === 0 ? (
          <p className="pagesub" style={{ marginTop: 0 }}>No fraud checks run yet — try "Run all seeded scenarios" below, or submit a transfer from the Transfer page.</p>
        ) : (
          <div className="grid cols-4">
            <div className="card"><StatusBadge status="AUTO_APPROVED" /><div className="num" style={{ marginTop: 8 }}>{stats.status_counts.AUTO_APPROVED}</div></div>
            <div className="card"><StatusBadge status="FLAGGED" /><div className="num" style={{ marginTop: 8 }}>{stats.status_counts.FLAGGED}</div></div>
            <div className="card"><StatusBadge status="HIGH_RISK" /><div className="num" style={{ marginTop: 8 }}>{stats.status_counts.HIGH_RISK}</div></div>
          </div>
        )}
      </section>

      <section>
        <h2>Recent activity</h2>
        {stats.recent_activity.length === 0 ? (
          <p className="pagesub" style={{ marginTop: 0 }}>Nothing yet.</p>
        ) : (
          <table className="ledger">
            <thead><tr><th>Parcel</th><th>Status</th><th>Score</th><th>When</th></tr></thead>
            <tbody>
              {stats.recent_activity.map((a, i) => (
                <tr key={i}>
                  <td className="ulpin">{a.ulpin}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.composite_risk_score}</td>
                  <td className="hash">{a.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Run all seeded scenarios</h2>
        <p className="pagesub" style={{ marginTop: 0 }}>Eight planted cases covering every fraud pattern the engine detects — fastest way to see the whole system work at once.</p>
        <button className="secondary" onClick={runDemo} disabled={demoLoading}>
          {demoLoading ? "Running…" : "Run all seeded scenarios"}
        </button>
        {demoResults && (
          <table className="ledger" style={{ marginTop: 16 }}>
            <thead><tr><th>Parcel</th><th>Status</th><th>Score</th><th>Flags</th><th>Scenario</th></tr></thead>
            <tbody>
              {demoResults.map((d, i) => (
                <tr key={i} className="clickable" onClick={() => navigate("/registry/" + encodeURIComponent(d.ulpin))}>
                  <td className="ulpin">{d.ulpin}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>{d.composite_risk_score}</td>
                  <td>{d.flags.map(f => f.code).join(", ") || "—"}</td>
                  <td style={{ fontSize: 13, color: "var(--muted)" }}>{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------- Registry ----

function Registry() {
  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => { apiGet("/properties").then(setProperties).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(p =>
      p.ulpin.toLowerCase().includes(q) ||
      p.current_owner.toLowerCase().includes(q) ||
      (p.survey_number || "").toLowerCase().includes(q)
    );
  }, [properties, query]);

  return (
    <div>
      <h1 className="pagetitle">Registry</h1>
      <p className="pagesub">Every parcel currently in the system — the full database, not a sample. Click a row for its complete chain-of-custody.</p>

      <div className="searchbox">
        <input type="text" style={{ width: "100%", maxWidth: 420 }} placeholder="Search by ULPIN, owner, or survey number…"
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <table className="ledger">
        <thead><tr><th>ULPIN</th><th>Owner</th><th>Survey No.</th><th>Area (sqm)</th><th>Registration Office</th></tr></thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.ulpin} className="clickable" onClick={() => navigate("/registry/" + encodeURIComponent(p.ulpin))}>
              <td className="ulpin">{p.ulpin}</td>
              <td>{p.current_owner}</td>
              <td>{p.survey_number}</td>
              <td>{p.area_sqm}</td>
              <td style={{ fontSize: 13 }}>{p.registration_office}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p className="pagesub">No matches.</p>}
    </div>
  );
}

// --------------------------------------------------------- ParcelDetail ----

function ParcelDetail({ ulpin }) {
  const [prop, setProp] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/properties/" + encodeURIComponent(ulpin)).then(setProp).catch(e => setError(e.message));
  }, [ulpin]);

  if (error) return <div className="banner">{error}</div>;
  if (!prop) return <div className="pagesub">Loading…</div>;

  return (
    <div>
      <h1 className="pagetitle">{prop.ulpin}</h1>
      <p className="pagesub">Survey {prop.survey_number} · {prop.area_sqm} sqm · {prop.registration_office}</p>

      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Current registered owner</div>
        <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600 }}>{prop.current_owner}</div>
        {prop.boundary && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Boundary on file — spatial overlap checks are active for this parcel.</div>}
        <button style={{ marginTop: 14 }} onClick={() => navigate("/transfer")}>Start a transfer for this parcel</button>
      </div>

      <section>
        <h2>Ownership history (off-chain record)</h2>
        <table className="ledger">
          <thead><tr><th>Date</th><th>From</th><th>To</th><th>Doc Hash</th></tr></thead>
          <tbody>
            {prop.transfer_history.map((t, i) => (
              <tr key={i}><td>{t.date}</td><td>{t.from}</td><td>{t.to}</td><td className="hash">{t.doc_hash}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>On-chain commits (this session)</h2>
        {prop.onchain_commits.length === 0 ? (
          <p className="pagesub" style={{ marginTop: 0 }}>No on-chain commits yet for this parcel in this session.</p>
        ) : (
          <table className="ledger">
            <thead><tr><th>Event</th><th>Tx Hash</th><th>From → To</th><th>Block</th><th>Timestamp</th></tr></thead>
            <tbody>
              {prop.onchain_commits.map((c, i) => (
                <tr key={i}>
                  <td><EventBadge type={c.event_type} /></td>
                  <td className="hash">{c.tx_hash}</td>
                  <td>{c.from || "—"} → {c.to}</td>
                  <td>{c.block_number}</td>
                  <td className="hash">{c.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------- RegisterParcel ----

function RegisterParcel({ auth }) {
  const [form, setForm] = useState({
    ulpin: "", survey_number: "", owner: "", area_sqm: "", registration_office: "", boundary: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!auth.user || auth.user.role !== "REGISTRAR") {
    return (
      <div>
        <h1 className="pagetitle">Register a new parcel</h1>
        <div className="banner">
          Only an authenticated Registrar can add a new parcel to the registry.
          <a onClick={() => navigate("/login")}> Log in as a Registrar</a> to continue.
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null); setSubmitting(true);
    try {
      let boundary = null;
      if (form.boundary.trim()) boundary = JSON.parse(form.boundary);
      const data = await apiPost("/properties", {
        ulpin: form.ulpin, survey_number: form.survey_number, owner: form.owner,
        area_sqm: parseFloat(form.area_sqm) || 0, registration_office: form.registration_office,
        boundary,
      }, auth.token);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="pagetitle">Register a new parcel</h1>
      <p className="pagesub">Enters a brand-new parcel into the registry with a genesis on-chain event. The claimed boundary (if provided) is checked against every existing parcel for spatial overlap — the same check used to catch double-registration fraud.</p>

      <div className="card" style={{ maxWidth: 520 }}>
        <form onSubmit={submit}>
          <label className="field-label">ULPIN</label>
          <input type="text" style={{ width: "100%" }} value={form.ulpin} onChange={set("ulpin")} placeholder="e.g. UP-0200-NEW" required />

          <label className="field-label">Survey number</label>
          <input type="text" style={{ width: "100%" }} value={form.survey_number} onChange={set("survey_number")} />

          <label className="field-label">Owner</label>
          <input type="text" style={{ width: "100%" }} value={form.owner} onChange={set("owner")} required />

          <label className="field-label">Area (sqm)</label>
          <input type="number" style={{ width: "100%" }} value={form.area_sqm} onChange={set("area_sqm")} />

          <label className="field-label">Registration office</label>
          <input type="text" style={{ width: "100%" }} value={form.registration_office} onChange={set("registration_office")} />

          <label className="field-label">Boundary (optional — JSON array of [x,y] points)</label>
          <textarea value={form.boundary} onChange={set("boundary")} placeholder="[[0,0],[40,0],[40,30],[0,30]]" />

          {error && <div style={{ color: "var(--brick)", fontSize: 13, marginTop: 10 }}>{error}</div>}
          <button type="submit" style={{ marginTop: 16 }} disabled={submitting}>
            {submitting ? "Registering…" : "Register parcel"}
          </button>
        </form>

        {result && (
          <div className="report" style={{ marginTop: 16, borderColor: "var(--moss)" }}>
            <strong>Registered.</strong> Genesis tx hash: <span className="hash">{result.onchain_entry.tx_hash}</span>
            <div style={{ marginTop: 8 }}><a onClick={() => navigate("/registry/" + encodeURIComponent(result.property.ulpin))}>View this parcel →</a></div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Transfer ----

function BoundaryOverlapSVG() {
  return (
    <div>
      <svg viewBox="0 0 90 50" style={{ width: "100%", maxWidth: 420, marginTop: 12, background: "#fff", border: "1px solid var(--parchment-line)" }}>
        <polygon points="2,2 82,2 82,32 2,32" fill="none" stroke="var(--moss)" strokeWidth="1.2" />
        <polygon points="43,2 68,2 68,36 43,36" fill="none" stroke="var(--ochre)" strokeWidth="1.2" />
        <polygon points="43,2 68,2 68,32 43,32" fill="var(--brick)" fillOpacity="0.35" stroke="none" />
        <text x="10" y="20" fontSize="4" fill="var(--moss)">Claimed boundary</text>
        <text x="45" y="45" fontSize="4" fill="var(--ochre)">Neighbor's registered boundary</text>
      </svg>
      <div style={{ fontSize: 12, color: "var(--brick)", marginTop: 4 }}>Shaded region = overlapping area flagged above.</div>
    </div>
  );
}

function TransferPage({ auth }) {
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [form, setForm] = useState({ ulpin: "", seller: "", buyer: "", claimed_area_sqm: "", transaction_date: "" });
  const [assessment, setAssessment] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [certResult, setCertResult] = useState(null);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isRegistrar = auth.user && auth.user.role === "REGISTRAR";

  const uploadDoc = async (file) => {
    setOcrLoading(true); setOcrResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiPost("/documents/upload", fd, auth.token, true);
      setOcrResult(data);
      const f = data.extracted_fields;
      setForm(prev => ({
        ulpin: f.ulpin || prev.ulpin,
        seller: f.owner_name || prev.seller,
        buyer: f.buyer_name || prev.buyer,
        claimed_area_sqm: f.area_sqm || prev.claimed_area_sqm,
        transaction_date: f.transaction_date || prev.transaction_date,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const runCheck = async (e) => {
    e.preventDefault();
    setError(""); setAssessment(null); setCommitResult(null); setCertResult(null);
    try {
      const data = await apiPost("/transfers", {
        ulpin: form.ulpin, seller: form.seller, buyer: form.buyer,
        claimed_area_sqm: parseFloat(form.claimed_area_sqm), transaction_date: form.transaction_date,
      });
      setAssessment(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const commit = async () => {
    try {
      const data = await apiPost("/transfers/" + encodeURIComponent(form.ulpin) + "/commit",
        { buyer: form.buyer, doc_hash: "0x" + Math.random().toString(16).slice(2) }, auth.token);
      setCommitResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const mint = async () => {
    try {
      const data = await apiPost("/properties/" + encodeURIComponent(form.ulpin) + "/mint-certificate", {}, auth.token);
      setCertResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const hasOverlapFlag = assessment && assessment.flags.some(f => f.code === "BOUNDARY_OVERLAP");

  return (
    <div>
      <h1 className="pagetitle">Transfer ownership</h1>
      <p className="pagesub">Runs every submission through the fraud engine before it can reach the chain. Assessment is public; only an authenticated Registrar can commit the result on-chain.</p>

      {!isRegistrar && (
        <div className="banner">
          You can run a fraud assessment without logging in — anyone can verify.
          But finalizing (commit + certificate) requires a Registrar session.
          <a onClick={() => navigate("/login")}> Log in as a Registrar</a> to unlock that step.
        </div>
      )}

      <section>
        <h2>Upload a scanned deed (optional)</h2>
        <div className="row">
          <input type="file" accept="image/*" onChange={e => e.target.files[0] && uploadDoc(e.target.files[0])} />
        </div>
        {ocrLoading && <p className="pagesub">Running OCR…</p>}
        {ocrResult && (
          <div className="report">
            Extraction confidence: <strong>{Math.round(ocrResult.confidence * 100)}%</strong>
            <pre>{JSON.stringify(ocrResult.extracted_fields, null, 2)}</pre>
          </div>
        )}
      </section>

      <section>
        <h2>Transfer details</h2>
        <form onSubmit={runCheck}>
          <div className="row" style={{ marginBottom: 8 }}>
            <input type="text" placeholder="ULPIN" value={form.ulpin} onChange={set("ulpin")} required />
            <input type="text" placeholder="Seller name" value={form.seller} onChange={set("seller")} required />
            <input type="text" placeholder="Buyer name" value={form.buyer} onChange={set("buyer")} required />
          </div>
          <div className="row">
            <input type="number" placeholder="Claimed area (sqm)" value={form.claimed_area_sqm} onChange={set("claimed_area_sqm")} required />
            <input type="date" value={form.transaction_date} onChange={set("transaction_date")} required />
            <button type="submit">Run fraud check</button>
          </div>
        </form>

        {error && <div className="report" style={{ borderColor: "var(--brick)" }}>{error}</div>}

        {assessment && (
          <div className="report">
            <StatusBadge status={assessment.status} /> &nbsp; Risk score: <strong>{assessment.composite_risk_score}</strong>
            <pre>{assessment.explanation}</pre>
            {hasOverlapFlag && <BoundaryOverlapSVG />}

            {assessment.status === "HIGH_RISK" ? (
              <div style={{ marginTop: 10, color: "var(--brick)", fontWeight: 600 }}>Blocked — cannot commit until a registrar clears this manually.</div>
            ) : isRegistrar ? (
              !commitResult ? (
                <button style={{ marginTop: 10 }} onClick={commit}>Commit to chain</button>
              ) : (
                <div className="report" style={{ marginTop: 10, borderColor: "var(--moss)" }}>
                  Committed. Tx hash: <span className="hash">{commitResult.onchain_entry.tx_hash}</span> · Block {commitResult.onchain_entry.block_number}
                  <div style={{ marginTop: 10 }}>
                    {!certResult ? (
                      <button onClick={mint}>Mint Verified Clean Title certificate</button>
                    ) : (
                      <div>
                        <strong>Certificate #{certResult.token_id} minted</strong> — owner {certResult.owner}<br />
                        Tx hash: <span className="hash">{certResult.tx_hash}</span><br />
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>Non-transferable — attests this parcel had a clean, verified on-chain transfer as of this block.</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
                <a onClick={() => navigate("/login")}>Log in as a Registrar</a> to commit this transfer on-chain.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------- BlockchainExplorer ----

function BlockchainExplorer() {
  const [activity, setActivity] = useState([]);

  useEffect(() => { apiGet("/chain/all").then(setActivity).catch(() => {}); }, []);

  return (
    <div>
      <h1 className="pagetitle">Blockchain explorer</h1>
      <p className="pagesub">
        Every on-chain event across the whole registry — parcel registrations, transfers, and
        certificate mints — in immutable order. This is the same event log LandRegistry.sol's
        TransferRegistered, ParcelRegistered, and CertificateMinted events would emit once
        deployed to a real testnet — running here against an in-memory mock chain so the demo
        works without a live RPC connection.
      </p>

      {activity.length === 0 ? (
        <p className="pagesub">No on-chain activity yet this session — register a parcel or commit a transfer to see it here.</p>
      ) : (
        <table className="ledger">
          <thead><tr><th>Block</th><th>Event</th><th>Parcel</th><th>From → To</th><th>Tx Hash</th><th>Timestamp</th></tr></thead>
          <tbody>
            {activity.map((e, i) => (
              <tr key={i} className="clickable" onClick={() => navigate("/registry/" + encodeURIComponent(e.ulpin))}>
                <td>{e.block_number}</td>
                <td><EventBadge type={e.event_type} /></td>
                <td className="ulpin">{e.ulpin}</td>
                <td>{e.from || "—"} → {e.to}</td>
                <td className="hash">{e.tx_hash}</td>
                <td className="hash">{e.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ App ----

export default function App() {
  const auth = useAuth();
  const hash = useHashRoute();
  const { path, rest } = parseRoute(hash);

  let page;
  if (path === "/login") page = <LoginPage auth={auth} />;
  else if (path === "/registry" && rest) page = <ParcelDetail ulpin={decodeURIComponent(rest)} />;
  else if (path === "/registry") page = <Registry />;
  else if (path === "/register") page = <RegisterParcel auth={auth} />;
  else if (path === "/transfer") page = <TransferPage auth={auth} />;
  else if (path === "/chain") page = <BlockchainExplorer />;
  else page = <Dashboard />;

  return (
    <>
      <NavBar auth={auth} route={path} />
      <main className="page">{page}</main>
      <footer className="sitefooter">
        Backend expected at <span className="hash">http://localhost:5000</span> — see README for setup. Demo data is entirely synthetic.
      </footer>
    </>
  );
}
