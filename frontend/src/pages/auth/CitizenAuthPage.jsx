import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { AuthShell } from "../../components/auth/AuthShell.jsx";
import { PasswordInput } from "../../components/auth/PasswordInput.jsx";
import { AuthError } from "../../components/auth/AuthError.jsx";
import { DigiLockerModal } from "../../components/auth/DigiLockerModal.jsx";
import { DemoCredentials } from "../../components/auth/DemoCredentials.jsx";
import { Mail, User, ShieldCheck, ArrowRight, Lock, CheckCircle2 } from "lucide-react";

export function CitizenAuthPage() {
  const { loginCitizen, loginDigiLocker, signup, user, isCitizen } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("login"); // "login" | "signup"
  const [loginMethod, setLoginMethod] = useState("email"); // "email" | "username" | "digilocker"

  // Login Form States
  const [identifier, setIdentifier] = useState("rajesh@demo.local");
  const [password, setPassword] = useState("Demo@001");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotNotice, setForgotNotice] = useState(false);

  // DigiLocker Modal State
  const [isDigiLockerOpen, setIsDigiLockerOpen] = useState(false);

  // Sign Up Form States
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
    digilockerVerified: false,
    consent: false,
  });
  const [signupError, setSignupError] = useState("");

  const destination = location.state?.from?.pathname || "/citizen/dashboard";

  // Redirect if already logged in as citizen
  React.useEffect(() => {
    if (user && isCitizen) {
      navigate(destination, { replace: true });
    }
  }, [user, isCitizen, destination, navigate]);

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      const res = await loginCitizen(identifier.trim(), password);
      if (res.ok) {
        navigate(destination, { replace: true });
      } else {
        setLoginError(res.error || "Authentication failed.");
      }
    } catch (err) {
      setLoginError("An unexpected error occurred during login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError("");
    setIsSubmitting(true);

    try {
      const res = await signup(signupForm);
      if (res.ok) {
        navigate(destination, { replace: true });
      } else {
        setSignupError(res.error || "Sign-up failed.");
      }
    } catch (err) {
      setSignupError("An unexpected error occurred during sign-up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // DigiLocker Simulation Completion
  const handleDigiLockerComplete = async (targetIdentifier, aadhaarLast4) => {
    const res = await loginDigiLocker(targetIdentifier, aadhaarLast4);
    if (res.ok) {
      setTimeout(() => {
        setIsDigiLockerOpen(false);
        navigate(destination, { replace: true });
      }, 700);
    }
    return res;
  };

  // Auto-fill credentials from Demo helper
  const handleAutoFill = (item) => {
    if (activeTab === "login") {
      setIdentifier(item.identifier || item.username);
      setPassword(item.password);
      setLoginError("");
    } else {
      setSignupForm((prev) => ({
        ...prev,
        name: item.label.split(" (")[0],
        email: item.identifier,
        username: item.username,
        password: item.password,
        confirmPassword: item.password,
        consent: true,
      }));
    }
  };

  return (
    <AuthShell
      portal="citizen"
      title="Citizen Titleholder Portal"
      subtitle="Verify land titles, inspect cadastral records, and manage property succession."
      badgeLabel="CITIZEN ACCESS"
    >
      {/* Tab Switcher: Login | Sign Up */}
      <div className="flex rounded-2xl bg-black/40 p-1 border border-white/10 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("login");
            setLoginError("");
          }}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
            activeTab === "login"
              ? "bg-cyan-500 text-navy-950 shadow-cyan-glow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("signup");
            setSignupError("");
          }}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
            activeTab === "signup"
              ? "bg-cyan-500 text-navy-950 shadow-cyan-glow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Register (Sign Up)
        </button>
      </div>

      {/* ================================================= */}
      {/* LOGIN TAB */}
      {/* ================================================= */}
      {activeTab === "login" && (
        <div className="space-y-4">
          {/* Method Selector Segmented Control: Email | Username | DigiLocker */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-mono text-slate-400">
              Authentication Method
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 border border-white/5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("email");
                  if (identifier.includes("@") === false) setIdentifier("rajesh@demo.local");
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 transition-all ${
                  loginMethod === "email"
                    ? "bg-white/10 text-white font-semibold border border-white/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Mail className="h-3 w-3" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMethod("username");
                  if (identifier.includes("@")) setIdentifier("rajesh");
                }}
                className={`flex items-center justify-center gap-1 rounded-lg py-1.5 transition-all ${
                  loginMethod === "username"
                    ? "bg-white/10 text-white font-semibold border border-white/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <User className="h-3 w-3" />
                <span>Username</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDigiLockerOpen(true)}
                className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-cyan-300 hover:bg-cyan-500/10 transition-all font-semibold border border-cyan-500/20"
              >
                <ShieldCheck className="h-3 w-3 text-cyan-400" />
                <span>DigiLocker</span>
              </button>
            </div>
          </div>

          <AuthError message={loginError} onDismiss={() => setLoginError("")} />

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-left">
            <div className="space-y-1">
              <label htmlFor="citizen-identifier" className="block text-xs font-medium text-slate-300">
                {loginMethod === "email" ? "Registered Email Address" : "Citizen Username"}
              </label>
              <input
                id="citizen-identifier"
                type={loginMethod === "email" ? "email" : "text"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginMethod === "email" ? "e.g. rajesh@demo.local" : "e.g. rajesh or rajesh.kumar"}
                required
                className="w-full rounded-xl border border-white/10 bg-navy-950/80 px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <PasswordInput
              id="citizen-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Demo@001"
              label="Demo Password"
              required
            />

            {/* Forgot Password Link */}
            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() => setForgotNotice(true)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Forgot password?
              </button>
              <span className="text-[10px] text-slate-500 font-mono">
                Format: Demo@ + last 3 of ID
              </span>
            </div>

            {forgotNotice && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-[11px] text-slate-300 flex items-center justify-between">
                <span>Password recovery is unavailable in this demo.</span>
                <button
                  type="button"
                  onClick={() => setForgotNotice(false)}
                  className="text-xs text-slate-400 hover:text-white ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-navy-950 transition-all hover:bg-cyan-400 disabled:opacity-50 shadow-cyan-glow-sm mt-2"
            >
              <span>{isSubmitting ? "Authenticating..." : "Sign In to Citizen Portal"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick autofill fixture helper */}
          <DemoCredentials portal="citizen" onSelectCredential={handleAutoFill} />
        </div>
      )}

      {/* ================================================= */}
      {/* SIGN UP TAB */}
      {/* ================================================= */}
      {activeTab === "signup" && (
        <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-left">
          <AuthError message={signupError} onDismiss={() => setSignupError("")} />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Full Legal Name
            </label>
            <input
              type="text"
              value={signupForm.name}
              onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
              placeholder="e.g. Ramesh Chandra"
              required
              className="w-full rounded-xl border border-white/10 bg-navy-950/80 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                placeholder="ramesh@demo.local"
                required
                className="w-full rounded-xl border border-white/10 bg-navy-950/80 px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Username
              </label>
              <input
                type="text"
                value={signupForm.username}
                onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                placeholder="ramesh.chandra"
                required
                className="w-full rounded-xl border border-white/10 bg-navy-950/80 px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PasswordInput
              id="signup-password"
              value={signupForm.password}
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              placeholder="Min 6 chars"
              label="Password"
              required
            />
            <PasswordInput
              id="signup-confirm"
              value={signupForm.confirmPassword}
              onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
              placeholder="Confirm pwd"
              label="Confirm Password"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Phone Number <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="tel"
              value={signupForm.phone}
              onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border border-white/10 bg-navy-950/80 px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
            />
          </div>

          {/* Optional DigiLocker Toggle */}
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer hover:border-cyan-500/30 transition-colors">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-white block">
                Simulate DigiLocker Association
              </span>
              <span className="text-[10px] text-slate-400 block">
                Flag registration for simulated pre-verification
              </span>
            </div>
            <input
              type="checkbox"
              checked={signupForm.digilockerVerified}
              onChange={(e) => setSignupForm({ ...signupForm, digilockerVerified: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400"
            />
          </label>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-navy-950/80 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={signupForm.consent}
              onChange={(e) => setSignupForm({ ...signupForm, consent: e.target.checked })}
              required
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400"
            />
            <span className="text-[10px] text-slate-400 leading-relaxed">
              I acknowledge that this demo registers a local browser record only and does not
              constitute government title verification or official cadastral registration.
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting || !signupForm.consent}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-navy-950 transition-all hover:bg-cyan-400 disabled:opacity-50 shadow-cyan-glow-sm"
          >
            <span>{isSubmitting ? "Creating Profile..." : "Create Demo Citizen Account"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Simulated DigiLocker Modal */}
      <DigiLockerModal
        isOpen={isDigiLockerOpen}
        onClose={() => setIsDigiLockerOpen(false)}
        onComplete={handleDigiLockerComplete}
      />
    </AuthShell>
  );
}
