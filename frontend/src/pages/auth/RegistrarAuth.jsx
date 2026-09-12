import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { DemoCredentials } from "../../components/auth/DemoCredentials.jsx";
import { BadgeCheck, ShieldAlert, ArrowRight, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

/**
 * RegistrarAuth: Official Departmental Login.
 * Form-dense, monospaced employee badge input, audited access banner.
 */
export function RegistrarAuth() {
  const { loginRegistrar, user, isRegistrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [badge, setBadge] = useState("GOV-REG-0182");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/registrar/transfer-desk";

  // Redirect if already logged in as registrar
  React.useEffect(() => {
    if (user && isRegistrar) {
      navigate(destination, { replace: true });
    }
  }, [user, isRegistrar, destination, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await loginRegistrar(badge.trim(), email.trim(), password);
      if (res.ok) {
        navigate(destination, { replace: true });
      } else {
        setError(res.error || "Official credentials could not be verified.");
      }
    } catch {
      setError("An unexpected error occurred during official authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoFill = (item) => {
    setBadge(item.badge || "");
    setEmail(item.email || item.identifier || "");
    setPassword(item.password || "Demo@001");
    setError("");
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex flex-col justify-between select-none">
      {/* 3px National Tricolour Accent Strip */}
      <div className="flex h-[3px] w-full">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-[#FFFFFF]" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* Main Centered Container */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-[480px] rounded-lg border border-[#D0D5DD] bg-white shadow-card p-6 sm:p-8 text-left animate-fade-slide-up">
          {/* Header */}
          <div className="text-center pb-6 border-b border-[#D0D5DD]">
            <Link to="/" className="inline-flex items-center gap-2 mb-3 focus:outline-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B3A67] text-white">
                <Lock className="h-5 w-5" />
              </div>
            </Link>
            <h1 className="text-xl font-bold text-[#101828]">
              Registrar Official Portal
            </h1>
            <p className="mt-1 text-xs text-[#475467]">
              Sub-Registrar Land Title Verification & Statutory Adjudication
            </p>
          </div>

          {/* Mandatory Audit Notice Banner */}
          <div className="mt-5 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[#B42318] mt-0.5" />
              <div>
                <span className="font-semibold text-[#B42318]">Authorised Government Use Only</span>
                <p className="mt-0.5 text-[11px] text-[#7F1D1D] leading-tight">
                  All property transfers, title health assessments, and override transactions conducted through this terminal are logged immutably with employee badge identifiers.
                </p>
              </div>
            </div>
          </div>

          {/* Inline Error */}
          {error && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B42318]"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Official Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="badge-input" className="block text-xs font-semibold text-[#344054]">
                  Government Employee ID / Registrar Badge *
                </label>
                <span className="rounded bg-[#F2F4F7] px-1.5 py-0.5 font-mono text-[10px] text-[#475467]">
                  Required
                </span>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="badge-input"
                  type="text"
                  required
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. GOV-REG-0182"
                  className="w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 pr-10 font-mono text-sm tracking-wider text-[#101828] placeholder-[#667085] focus:border-[#0B3A67] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 shadow-sm"
                />
                <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0B3A67]" />
              </div>
              <span className="mt-1 block text-[11px] text-[#667085]">
                Matches authorized sub-registrar directory
              </span>
            </div>

            <div>
              <label htmlFor="official-email" className="block text-xs font-medium text-[#344054]">
                Departmental Email Address (Optional for Demo)
              </label>
              <input
                id="official-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="suresh.singh@revenue.gov.in"
                className="mt-1.5 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#101828] placeholder-[#667085] focus:border-[#0B3A67] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 shadow-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="official-password" className="block text-xs font-medium text-[#344054]">
                  Password
                </label>
                <span className="text-[11px] text-[#667085] font-mono">Demo: Demo@182</span>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="official-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 pr-10 text-sm font-mono text-[#101828] placeholder-[#667085] focus:border-[#0B3A67] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#667085] hover:text-[#101828]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-[#0B3A67] py-2.5 px-4 text-sm font-semibold text-white hover:bg-[#1769AA] hover-lift transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Authenticating Official..." : "Access Official Registrar Desk"}
            </button>
          </form>

          {/* Auto-fill Helper */}
          <div className="mt-5 pt-3 border-t border-[#D0D5DD]">
            <DemoCredentials onSelectCredential={handleAutoFill} portal="registrar" />
          </div>

          {/* Switch to Citizen */}
          <div className="mt-5 pt-4 border-t border-[#D0D5DD] text-center">
            <Link
              to="/auth/citizen"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3A67] hover:text-[#1769AA]"
            >
              <span>Citizen / property owner? Go to Citizen Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-[#667085] border-t border-[#D0D5DD] bg-white">
        TitleLock Official Registry · Government of India · Unauthorized access is punishable by law.
      </footer>
    </div>
  );
}
