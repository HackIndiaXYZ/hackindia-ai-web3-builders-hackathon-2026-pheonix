import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { DigiLockerModal } from "../../components/auth/DigiLockerModal.jsx";
import { DemoCredentials } from "../../components/auth/DemoCredentials.jsx";
import { Mail, User, ShieldCheck, ArrowRight, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

/**
 * CitizenAuth: Clean White Government Portal Sign In & Registration.
 * Max-width 480px, 3px tricolour top strip, WCAG AA compliance.
 */
export function CitizenAuth() {
  const { loginCitizen, loginDigiLocker, signup, user, isCitizen } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("login"); // "login" | "signup"
  const [loginMethod, setLoginMethod] = useState("email"); // "email" | "username" | "digilocker"

  // Login Form States
  const [identifier, setIdentifier] = useState("rajesh@demo.local");
  const [password, setPassword] = useState("Demo@001");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      const res = await loginCitizen(identifier.trim(), password);
      if (res.ok) {
        navigate(destination, { replace: true });
      } else {
        setLoginError(res.error || "Invalid credentials provided.");
      }
    } catch {
      setLoginError("An unexpected error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Up
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError("");
    setIsSubmitting(true);

    try {
      const res = await signup(signupForm);
      if (res.ok) {
        navigate(destination, { replace: true });
      } else {
        setSignupError(res.error || "Registration could not be completed.");
      }
    } catch {
      setSignupError("An unexpected error occurred during registration.");
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
      }, 500);
    }
    return res;
  };

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
          {/* Official Header */}
          <div className="text-center pb-6 border-b border-[#D0D5DD]">
            <Link to="/" className="inline-flex items-center gap-2 mb-3 focus:outline-none">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B3A67] text-white">
                <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 4.1-2.56 7.91-6 8.91-3.44-1-6-4.81-6-8.91V6.43l6-2.25zM11 7v2h2V7h-2zm0 4v6h2v-6h-2z" />
                </svg>
              </div>
            </Link>
            <h1 className="text-xl font-bold text-[#101828]">
              Department of Land Records — Citizen Portal
            </h1>
            <p className="mt-1 text-xs text-[#475467]">
              Government of India · Verified Titleholder Services
            </p>
          </div>

          {/* Tab Switcher: Login | Sign up */}
          <div className="mt-6 flex rounded-md bg-[#F2F4F7] p-1 border border-[#D0D5DD]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setLoginError("");
              }}
              className={`flex-1 rounded py-1.5 text-xs font-semibold transition-all ${
                activeTab === "login"
                  ? "bg-white text-[#0B3A67] shadow-sm"
                  : "text-[#475467] hover:text-[#101828]"
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
              className={`flex-1 rounded py-1.5 text-xs font-semibold transition-all ${
                activeTab === "signup"
                  ? "bg-white text-[#0B3A67] shadow-sm"
                  : "text-[#475467] hover:text-[#101828]"
              }`}
            >
              Register (Sign Up)
            </button>
          </div>

          {/* Inline Error Banner */}
          {loginError && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B42318]"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{loginError}</div>
            </div>
          )}

          {/* ======================================= */}
          {/* LOGIN TAB */}
          {/* ======================================= */}
          {activeTab === "login" && (
            <div className="mt-6 space-y-4">
              {/* Login Method Segmented Control */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#344054]">
                  Authentication Method
                </label>
                <div className="grid grid-cols-3 gap-1.5 rounded-md bg-[#F8FAFC] p-1 border border-[#D0D5DD] text-xs">
                  <button
                    type="button"
                    onClick={() => setLoginMethod("email")}
                    className={`flex items-center justify-center gap-1 rounded py-1.5 transition-colors ${
                      loginMethod === "email"
                        ? "bg-white font-semibold text-[#0B3A67] shadow-sm border border-[#D0D5DD]"
                        : "text-[#475467] hover:text-[#101828]"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod("username")}
                    className={`flex items-center justify-center gap-1 rounded py-1.5 transition-colors ${
                      loginMethod === "username"
                        ? "bg-white font-semibold text-[#0B3A67] shadow-sm border border-[#D0D5DD]"
                        : "text-[#475467] hover:text-[#101828]"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Username</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod("digilocker");
                      setIsDigiLockerOpen(true);
                    }}
                    className={`flex items-center justify-center gap-1 rounded py-1.5 transition-colors ${
                      loginMethod === "digilocker"
                        ? "bg-[#0F766E] text-white font-semibold shadow-sm"
                        : "text-[#0F766E] font-medium hover:bg-[#F0FDFA]"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>DigiLocker</span>
                  </button>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="identifier-input" className="block text-xs font-medium text-[#344054]">
                    {loginMethod === "email" ? "Registered Email Address" : "Registered Username"}
                  </label>
                  <input
                    id="identifier-input"
                    type={loginMethod === "email" ? "email" : "text"}
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#101828] placeholder-[#667085] focus:border-[#0B3A67] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 shadow-sm"
                    placeholder={loginMethod === "email" ? "rajesh@demo.local" : "rajesh"}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password-input" className="block text-xs font-medium text-[#344054]">
                      Password
                    </label>
                    <span className="text-[11px] text-[#667085] font-mono">Demo: Demo@001</span>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  className="w-full rounded-md bg-[#0B3A67] py-2.5 px-4 text-sm font-semibold text-white hover:bg-[#1769AA] hover-lift transition-colors focus:outline-none shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Verifying..." : "Sign In to Citizen Portal"}
                </button>
              </form>

              {/* Demo Credentials Helper */}
              <div className="pt-3 border-t border-[#D0D5DD]">
                <DemoCredentials onSelectCredential={handleAutoFill} portal="citizen" />
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* SIGN UP TAB */}
          {/* ======================================= */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignupSubmit} className="mt-6 space-y-3.5">
              {signupError && (
                <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B42318]">
                  {signupError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#344054]">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                  className="mt-1 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#101828]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#344054]">Email Address</label>
                <input
                  type="email"
                  required
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  placeholder="ramesh@demo.local"
                  className="mt-1 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#101828]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[#344054]">Password</label>
                  <input
                    type="password"
                    required
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="mt-1 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#101828]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#344054]">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    className="mt-1 w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#101828]"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="citizen-consent"
                  required
                  checked={signupForm.consent}
                  onChange={(e) => setSignupForm({ ...signupForm, consent: e.target.checked })}
                  className="mt-1 h-3.5 w-3.5 rounded border-[#D0D5DD] text-[#0B3A67]"
                />
                <label htmlFor="citizen-consent" className="text-[11px] text-[#475467] leading-tight">
                  I consent to linking my synthetic cadastral records in this demo session.
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-[#0B3A67] py-2.5 px-4 text-sm font-semibold text-white hover:bg-[#1769AA] hover-lift transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Registering..." : "Create Demo Citizen Account"}
              </button>
            </form>
          )}

          {/* Bottom Switch to Registrar Login */}
          <div className="mt-6 pt-4 border-t border-[#D0D5DD] text-center">
            <Link
              to="/auth/registrar"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3A67] hover:text-[#1769AA]"
            >
              <span>Registrar / official? Sign in here</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Simulated DigiLocker Modal */}
      <DigiLockerModal
        isOpen={isDigiLockerOpen}
        onClose={() => setIsDigiLockerOpen(false)}
        onComplete={handleDigiLockerComplete}
      />

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#667085] border-t border-[#D0D5DD] bg-white">
        TitleLock Portal · Government of India · Data is synthetic for hackathon demonstration.
      </footer>
    </div>
  );
}
