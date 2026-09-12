import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { AuthShell } from "../../components/auth/AuthShell.jsx";
import { PasswordInput } from "../../components/auth/PasswordInput.jsx";
import { AuthError } from "../../components/auth/AuthError.jsx";
import { DemoCredentials } from "../../components/auth/DemoCredentials.jsx";
import { BadgeCheck, Landmark, Mail, ArrowRight, Shield, AlertTriangle } from "lucide-react";

export function RegistrarAuthPage() {
  const { loginRegistrar, user, isRegistrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [badge, setBadge] = useState("GOV-REG-0182");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/registrar/dashboard";

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
        setError(res.error || "Authentication rejected.");
      }
    } catch (err) {
      setError("An unexpected error occurred during registrar validation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoFill = (item) => {
    setBadge(item.badge);
    setEmail(item.email || "");
    setPassword(item.password || "");
    setError("");
  };

  return (
    <AuthShell
      portal="registrar"
      title="Registrar Authority Portal"
      subtitle="Government Cadastral Verification & Statutory Deed Adjudication Console"
      badgeLabel="DEPARTMENTAL PORTAL"
    >
      <div className="space-y-4">
        {/* Government Disclaimer Notice */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            Demo validation only. This does not verify employment with any government department.
          </p>
        </div>

        <AuthError message={error} onDismiss={() => setError("")} />

        {/* Administrative Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Required Badge Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="registrar-badge" className="block text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
                Government Employee ID / Registrar Badge *
              </label>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.2 font-mono text-[9px] text-amber-300">
                Required
              </span>
            </div>
            <div className="relative">
              <input
                id="registrar-badge"
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. GOV-REG-0182"
                required
                className="w-full rounded-xl border border-amber-500/30 bg-[#060b18] px-3.5 py-2.5 text-xs font-mono tracking-wider text-amber-200 placeholder-slate-600 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              Case-insensitive match against official directory
            </span>
          </div>

          {/* Divider for Optional Credentials */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
              <span className="bg-[#0a0f1c] px-2 text-slate-500">
                Optional 2FA Verification Credentials
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-3.5">
            <div className="space-y-1">
              <label htmlFor="registrar-email" className="block text-xs font-medium text-slate-300">
                Official Government Email <span className="text-slate-500 font-mono text-[10px]">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="registrar-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya.registrar@demo.local"
                  className="w-full rounded-xl border border-white/10 bg-[#060b18] px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none focus:border-amber-400"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>

            <PasswordInput
              id="registrar-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Demo@001"
              label="Official Passphrase"
              required={false}
            />

            <span className="text-[10px] text-slate-400 font-mono block">
              Rule: Provide both email and passphrase, or leave both empty.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-xs font-bold text-navy-950 transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 shadow-md shadow-amber-500/10"
          >
            <span>{isSubmitting ? "Validating Credentials..." : "Authenticate Registrar Authority"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Quick Test Fixture autofill */}
        <DemoCredentials portal="registrar" onSelectCredential={handleAutoFill} />
      </div>
    </AuthShell>
  );
}
