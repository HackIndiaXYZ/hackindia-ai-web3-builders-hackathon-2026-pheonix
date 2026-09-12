import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Landmark, ShieldCheck, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";

export function BankAuth() {
  const { loginBank, user, isBank } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("rahul.bank@demo.local");
  const [password, setPassword] = useState("Demo@001");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/bank/dashboard";

  React.useEffect(() => {
    if (user && isBank) {
      navigate(destination, { replace: true });
    }
  }, [user, isBank, destination, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await loginBank(email.trim(), password);
      if (res.ok) {
        navigate(destination, { replace: true });
      } else {
        setError(res.error || "Bank officer credentials could not be verified.");
      }
    } catch {
      setError("An unexpected error occurred during institutional authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex flex-col justify-between select-none">
      {/* Top 3px accent strip */}
      <div className="flex h-[3px] w-full">
        <div className="w-1/3 bg-[#027A48]" />
        <div className="w-1/3 bg-[#059669]" />
        <div className="w-1/3 bg-[#0B3A67]" />
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-[480px] rounded-xl border border-[#D0D5DD] bg-white shadow-xl p-6 sm:p-8 text-left">
          <div className="text-center pb-6 border-b border-[#D0D5DD]">
            <Link to="/" className="inline-flex items-center gap-2 mb-3 focus:outline-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#027A48] text-white">
                <Landmark className="h-5 w-5" />
              </div>
            </Link>
            <h1 className="text-xl font-bold text-[#101828]">
              Institutional Banking Portal
            </h1>
            <p className="mt-1 text-xs text-[#475467]">
              TitleLock Encumbrance, Lien & Mortgage Verification Console
            </p>
          </div>

          <div className="mt-5 rounded-md border border-[#A6F4C5] bg-[#ECFDF3] p-3 text-xs text-[#027A48]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#027A48] mt-0.5" />
              <div>
                <span className="font-semibold text-[#027A48]">Authorised Lending Institution Desk</span>
                <p className="mt-0.5 text-[11px] text-[#054F31] leading-tight">
                  Access to cadastral title search, CERSAI encumbrance registration, and mortgage status inquiry.
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
              <label className="block text-xs font-semibold text-[#344054]">
                Institutional Bank Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul.bank@demo.local"
                className="mt-1.5 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#101828] focus:border-[#027A48] focus:outline-none focus:ring-2 focus:ring-[#027A48]/20 shadow-sm"
              />
              <span className="mt-1 block text-[11px] text-[#667085]">
                Authorized demo officer: rahul.bank@demo.local
              </span>
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
                  className="w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 pr-10 text-sm font-mono text-[#101828] focus:border-[#027A48] focus:outline-none focus:ring-2 focus:ring-[#027A48]/20 shadow-sm"
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
              className="w-full rounded-md bg-[#027A48] py-2.5 px-4 text-sm font-semibold text-white hover:bg-[#054F31] transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Authenticating Officer..." : "Access Mortgage & Lien Clearance Desk"}
            </button>
          </form>

          {/* Quick autofill */}
          <div className="mt-5 pt-3 border-t border-[#D0D5DD]">
            <p className="text-[11px] font-semibold text-[#475467] uppercase tracking-wider mb-2">
              Default Demo Credit Officer
            </p>
            <button
              type="button"
              onClick={() => {
                setEmail("rahul.bank@demo.local");
                setPassword("Demo@001");
                setError("");
              }}
              className="w-full p-2 rounded-lg border border-[#D0D5DD] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left text-xs transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-[#101828]">Rahul Bansal</span>
                <span className="text-[10px] text-[#667085] ml-2 font-mono">rahul.bank@demo.local</span>
              </div>
              <span className="text-[10px] bg-[#ECFDF3] text-[#027A48] font-bold px-1.5 py-0.5 rounded">
                BANK OFFICER
              </span>
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-[#D0D5DD] flex items-center justify-between text-xs">
            <Link to="/auth/citizen" className="text-[#0B3A67] hover:underline">
              Citizen Portal
            </Link>
            <Link to="/auth/registrar" className="text-[#0B3A67] hover:underline">
              Registrar Portal
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-[#667085] border-t border-[#D0D5DD] bg-white">
        Institutional TitleLock Console · CERSAI & RBI Regulatory Conformance
      </footer>
    </div>
  );
}

export default BankAuth;
