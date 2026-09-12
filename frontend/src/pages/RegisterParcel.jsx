import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiHash, FiUser, FiMap, FiAlertTriangle, FiCheckCircle, FiLock } from "react-icons/fi";
import { apiPost } from "../lib/api.js";
import { navigate } from "../hooks/useHashRoute.js";
import { BoundaryOverlapSVG } from "../components/BoundaryOverlapSVG.jsx";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-base-800 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none transition-shadow focus:border-accent/50 focus:shadow-glow-sm";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, step, title }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">
        {step}
      </div>
      <Icon className="h-4 w-4 text-zinc-500" />
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
    </div>
  );
}

export function RegisterParcel({ auth }) {
  const [form, setForm] = useState({
    ulpin: "", survey_number: "", owner: "", area_sqm: "", registration_office: "", boundary: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [overlapGeometry, setOverlapGeometry] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Don't flash the login gate at a user whose stored session is still being
  // validated against the server.
  if (auth.checking) {
    return <p className="text-sm text-zinc-500">Checking your session…</p>;
  }

  if (!auth.isRegistrar) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/15 p-6 text-sm text-zinc-400">
        <FiLock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
        <div>
          Only an authenticated Registrar can add a new parcel to the registry.{" "}
          <a onClick={() => navigate("/login")} className="cursor-pointer text-accent underline">
            Log in as a Registrar
          </a>{" "}
          to continue.
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null); setOverlapGeometry(null);

    let boundary = null;
    if (form.boundary.trim()) {
      try {
        boundary = JSON.parse(form.boundary);
      } catch {
        // A raw JSON.parse SyntaxError ("Unexpected token } in JSON at
        // position 14") is not a useful message for a registrar.
        setError("Boundary must be valid JSON, e.g. [[0,0],[40,0],[40,30],[0,30]]");
        return;
      }
    }

    setSubmitting(true);
    try {
      const data = await apiPost("/properties", {
        ulpin: form.ulpin.trim(), survey_number: form.survey_number.trim(),
        owner: form.owner.trim(), area_sqm: form.area_sqm,
        registration_office: form.registration_office.trim(),
        ...(boundary ? { boundary } : {}),
      }, auth.token);
      setResult(data);
    } catch (err) {
      setError(err.message);
      // The backend returns the overlapping geometry on a 409 so the refusal
      // can be shown as a diagram, not just prose.
      if (err.geometry) setOverlapGeometry(err.geometry);
    } finally {
      setSubmitting(false);
    }
  };

  const isOverlapError = error.toLowerCase().includes("overlap");

  return (
    <div className="max-w-xl">
      <p className="mb-6 text-sm text-zinc-400">
        Enters a brand-new parcel with a genesis on-chain event. The claimed
        boundary, if provided, is checked against every existing parcel for
        spatial overlap — the same check that catches double-registration fraud.
      </p>

      <form onSubmit={submit} className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-base-900/50 p-6">
          <SectionHeader icon={FiHash} step="1" title="Parcel identity" />
          <div className="space-y-4">
            <Field label="ULPIN">
              <input className={inputClass} value={form.ulpin} onChange={set("ulpin")} placeholder="UP-0200-NEW" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Survey number">
                <input className={inputClass} value={form.survey_number} onChange={set("survey_number")} />
              </Field>
              <Field label="Registration office">
                <input className={inputClass} value={form.registration_office} onChange={set("registration_office")} />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-base-900/50 p-6">
          <SectionHeader icon={FiUser} step="2" title="Ownership" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner">
              <input className={inputClass} value={form.owner} onChange={set("owner")} required />
            </Field>
            <Field label="Area (sqm)">
              <input type="number" className={inputClass} value={form.area_sqm} onChange={set("area_sqm")} />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-base-900/50 p-6">
          <SectionHeader icon={FiMap} step="3" title="Spatial data (optional)" />
          <Field label="Boundary — JSON array of [x,y] points">
            <textarea
              className={inputClass + " min-h-[70px]"}
              value={form.boundary}
              onChange={set("boundary")}
              placeholder="[[0,0],[40,0],[40,30],[0,30]]"
            />
          </Field>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-black shadow-glow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {submitting ? "Checking for overlaps…" : "Register parcel"}
        </motion.button>
      </form>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 flex items-start gap-3 rounded-lg border p-4 text-sm ${
              isOverlapError
                ? "border-risk-high/30 bg-risk-high/5 text-risk-high"
                : "border-white/10 bg-base-800 text-zinc-300"
            }`}
          >
            <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              {isOverlapError && <div className="mb-1 font-semibold">Spatial overlap detected</div>}
              {error}
              {overlapGeometry && <BoundaryOverlapSVG geometry={overlapGeometry} />}
            </div>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-3 rounded-lg border border-risk-approved/30 bg-risk-approved/5 p-4 text-sm"
          >
            <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-risk-approved" />
            <div>
              <div className="font-semibold text-risk-approved">Registered</div>
              <div className="mt-1 font-mono text-xs text-zinc-400">
                Genesis tx: {result.onchain_entry.tx_hash}
              </div>
              <a
                onClick={() => navigate("/registry/" + encodeURIComponent(result.property.ulpin))}
                className="mt-2 inline-block cursor-pointer text-accent underline"
              >
                View this parcel →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
