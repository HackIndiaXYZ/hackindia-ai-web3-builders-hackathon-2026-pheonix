import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { ShieldCheck, ShieldAlert, ArrowRight, Lock, Eye, EyeOff, AlertCircle, FileSpreadsheet } from "lucide-react";

export function AuditorAuth() {
  const { loginAuditor, user, isAuditor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [badge, setBadge] = useState("AUD-0094");
  const [email, setEmail] = useState("arvind.audit@demo.local");
  const [password, setPassword] = useState("Demo@001");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/auditor/dashboard";

  React.useEffect(() => {
    if (user && isAuditor) {
      navigate(destination, { replace: true });
    }
  }, [user, isAuditor, destination, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await loginAuditor(badge.trim(), email.trim(), password);
      if (res.ok) {
        navigate(destination, { replace: true });
      } else {
        setError(res.error || "Auditor credentials could not be verified.");
      }
    } catch {
      setError("An unexpected error occurred during auditor authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectQuickAccount = (b, em, pw) => {
    setBadge(b);
    setEmail(em);
    setPassword(pw);
    setError("");
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex flex-col justify-between select-none">
      {/* 3px accent strip */}
      <div className="flex h-[3px] w-full">
        <div className="w-1/3 bg-[#0E7090]" />
        <div className="w-1/3 bg-[#0284C7]" />
        <div className="w-1/3 bg-[#047857]" />
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-[480px] rounded-xl border border-[#D0D5DD] bg-white shadow-xl p-6 sm:p-8 text-left">
          <div className="text-center pb-6 border-b border-[#D0D5DD]">
            <Link to="/" className="inline-flex items-center gap-2 mb-3 focus:outline-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0E7090] text-white">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </Link>
            <h1 className="text-xl font-bold text-[#101828]">
              State Land Audit Directorate
            </h1>
            <p className="mt-1 text-xs text-[#475467]">
              Independent Cadastral Oversight & Cryptographic Verification
            </p>
          </div>

          <div className="mt-5 rounded-md border border-[#BAE6FD] bg-[#ECFEFF] p-3 text-xs text-[#0369A1]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#0284C7] mt-0.5" />
              <div>
                <span className="font-semibold text-[#0369A1]">Statutory Audit Terminal</span>
                <p className="mt-0.5 text-[11px] text-[#0C4A6E] leading-tight">
                  Authorized for Comptroller, State Audit officers, and anti-corruption oversight. All session actions are recorded with hash chaining.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B42318]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#344054]">
                  Auditor Badge / Registration ID *
                </label>
                <span className="rounded bg-[#F2F4F7] px-1.5 py-0.5 font-mono text-[10px] text-[#475467]">
                  Required
                </span>
              </div>
              <input
                type="text"
                required
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. AUD-0094"
                className="mt-1.5 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 font-mono text-sm tracking-wider text-[#101828] focus:border-[#0E7090] focus:outline-none focus:ring-2 focus:ring-[#0E7090]/20 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#344054]">
                Official Directorate Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="arvind.audit@demo.local"
                className="mt-1.5 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#101828] focus:border-[#0E7090] focus:outline-none focus:ring-2 focus:ring-[#0E7090]/20 shadow-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#344054]">
                  Password
                </label>
                <span className="text-[11px] text-[#667085] font-mono">Demo: Demo@001</span>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 pr-10 text-sm font-mono text-[#101828] focus:border-[#0E7090] focus:outline-none focus:ring-2 focus:ring-[#0E7090]/20 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#667085] hover:text-[#101828]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-[#0E7090] py-2.5 px-4 text-sm font-semibold text-white hover:bg-[#155E75] transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Authenticating Auditor..." : "Access State Audit Directorate"}
            </button>
          </form>

          {/* Quick Demo Auditor Accounts */}
          <div className="mt-5 pt-3 border-t border-[#D0D5DD]">
            <p className="text-[11px] font-semibold text-[#475467] uppercase tracking-wider mb-2">
              Select Demo Auditor Profile
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectQuickAccount("AUD-0094", "arvind.audit@demo.local", "Demo@001")}
                className="p-2 rounded-lg border border-[#D0D5DD] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left text-xs transition-colors"
              >
                <div className="font-bold text-[#101828]">Arvind Mehta</div>
                <div className="text-[10px] text-[#667085] font-mono">AUD-0094 (Auditor)</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickAccount("DEMO-MULTI-002", "neha@demo.local", "Demo@002")}
                className="p-2 rounded-lg border border-[#D0D5DD] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left text-xs transition-colors"
              >
                <div className="font-bold text-[#101828]">Neha Verma</div>
                <div className="text-[10px] text-[#667085] font-mono">DEMO-MULTI-002 (Multi)</div>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#D0D5DD] flex items-center justify-between text-xs">
            <Link to="/auth/registrar" className="text-[#0B3A67] hover:underline">
              Sub-Registrar Login
            </Link>
            <Link to="/auth/citizen" className="text-[#0B3A67] hover:underline">
              Citizen Portal
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-[#667085] border-t border-[#D0D5DD] bg-white">
        State Land Audit Directorate · Comptroller & Auditor General Alignment
      </footer>
    </div>
  );
}

export default AuditorAuth;
