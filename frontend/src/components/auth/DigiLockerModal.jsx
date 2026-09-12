import React, { useState } from "react";
import { X, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Lock, KeyRound } from "lucide-react";
import { AuthError } from "./AuthError.jsx";

/**
 * Simulated DigiLocker / Aadhaar Consent Modal & Stepper.
 * Strict compliance rules:
 * - NO network or UIDAI calls.
 * - Collects ONLY the last 4 digits.
 * - Displays masked as XXXX-XXXX-1234.
 * - Input is cleared after completion.
 * - Displays mandatory DPDP Act and simulation disclaimers.
 */
export function DigiLockerModal({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(1); // 1: Consent & Explainer, 2: Input Last 4 & Account, 3: Simulated Success
  const [consentGiven, setConsentGiven] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setAadhaarLast4("");
    setIdentifier("");
    setError("");
    setStep(1);
    setConsentGiven(false);
    onClose();
  };

  const handleNextToInput = () => {
    if (!consentGiven) {
      setError("You must explicitly acknowledge the consent declaration to proceed.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmitSimulation = async (e) => {
    e.preventDefault();
    setError("");

    const cleanDigits = aadhaarLast4.trim();
    if (!/^\d{4}$/.test(cleanDigits)) {
      setError("Please enter exactly the last 4 digits of your Aadhaar card (e.g. 1234).");
      return;
    }

    if (!identifier.trim()) {
      setError("Please specify the registered email or username associated with your title.");
      return;
    }

    setIsProcessing(true);

    // Simulated short delay (350ms) to mimic cryptographic consent verification
    setTimeout(async () => {
      try {
        const result = await onComplete(identifier.trim(), cleanDigits);
        // Clear sensitive input immediately after processing
        setAadhaarLast4("");

        if (result && !result.ok) {
          setError(result.error || "Simulation failed.");
          setIsProcessing(false);
          return;
        }

        setIsProcessing(false);
        setStep(3); // Success step
      } catch (err) {
        setAadhaarLast4("");
        setError("An unexpected error occurred during consent resolution.");
        setIsProcessing(false);
      }
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-labelledby="digilocker-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-cyan-500/30 bg-navy-900/95 shadow-glass backdrop-blur-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-navy-950/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 id="digilocker-modal-title" className="font-display font-bold text-sm text-white">
                Continue with simulated DigiLocker
              </h3>
              <p className="text-[11px] text-cyan-400 font-mono">
                Simulated Consent & Identity Grant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="grid grid-cols-3 gap-1 border-b border-white/5 bg-black/20 p-2 text-center text-[10px] font-mono">
          <div className={`py-1 rounded ${step >= 1 ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-500"}`}>
            1. Consent Notice
          </div>
          <div className={`py-1 rounded ${step >= 2 ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-500"}`}>
            2. Match & Token
          </div>
          <div className={`py-1 rounded ${step === 3 ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-slate-500"}`}>
            3. Grant Verified
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <AuthError message={error} onDismiss={() => setError("")} />

          {/* STEP 1: Consent & Mandatory Disclaimers */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-[11px]">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Mandatory Simulation Notice</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Demo only: this screen simulates a DigiLocker consent flow. It does not
                  connect to DigiLocker, UIDAI, or any government identity service. No Aadhaar
                  number is verified or stored.
                </p>
                <p className="text-[10px] text-amber-200/75 leading-relaxed pt-1 border-t border-amber-500/20">
                  Production use would require an approved integration, lawful purpose, consent
                  management, data minimisation, security controls, and compliance review under
                  applicable Indian data-protection requirements, including the DPDP Act.
                </p>
              </div>

              {/* Explainer Box */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1.5 text-slate-300">
                <div className="font-semibold text-white">How this simulation works:</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                  <li>You will be asked ONLY for the last 4 digits of an Aadhaar number.</li>
                  <li>Your input will be formatted and masked as <span className="font-mono text-cyan-300">XXXX-XXXX-1234</span>.</li>
                  <li>The demo resolves your profile against eligible mock records (e.g. Rajesh Kumar).</li>
                  <li>No external network requests or biometric queries are performed.</li>
                </ul>
              </div>

              {/* Consent Checkbox */}
              <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-navy-950/80 p-3 cursor-pointer hover:border-cyan-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-[11px] text-slate-300 leading-relaxed">
                  I understand this is an educational synthetic simulation. I consent to test
                  the simulated credential resolution flow with the demo directory.
                </span>
              </label>

              <button
                type="button"
                onClick={handleNextToInput}
                disabled={!consentGiven}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-navy-950 transition-all hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-cyan-glow-sm"
              >
                <span>Continue to Credential Match</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Input Last 4 Digits & Directory Account */}
          {step === 2 && (
            <form onSubmit={handleSubmitSimulation} className="space-y-4 text-xs text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Associated Directory Identifier (Email or Username)
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. rajesh@demo.local or rajesh"
                  required
                  className="w-full rounded-xl border border-white/10 bg-navy-950/80 px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
                <div className="text-[10px] text-slate-500">
                  Tip: try <span className="text-cyan-300 font-mono">rajesh@demo.local</span> or <span className="text-cyan-300 font-mono">anita@demo.local</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Last 4 Digits of Aadhaar (Simulation Only)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    value={aadhaarLast4}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setAadhaarLast4(val);
                    }}
                    placeholder="1234"
                    required
                    className="w-full rounded-xl border border-white/10 bg-navy-950/80 px-3.5 py-2.5 text-sm font-mono tracking-widest text-center text-cyan-300 placeholder-slate-600 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>Display Mask:</span>
                  <span className="text-cyan-400 font-bold">
                    XXXX-XXXX-{aadhaarLast4 ? aadhaarLast4.padStart(4, "•") : "••••"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-3 text-[11px] text-slate-400 space-y-1 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Lock className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Privacy Guarantee</span>
                </div>
                <p>
                  No full Aadhaar number is collected or stored. Input is immediately purged
                  upon simulated token generation.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || aadhaarLast4.length !== 4 || !identifier}
                  className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-xs font-semibold text-navy-950 transition-all hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-cyan-glow-sm"
                >
                  {isProcessing ? "Resolving Simulated Consent..." : "Simulate Consent & Login"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success State */}
          {step === 3 && (
            <div className="py-4 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="h-8 w-8 animate-bounce" />
              </div>

              <div className="space-y-1">
                <h4 className="font-display font-bold text-base text-white">
                  Simulated Consent Token Resolved
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Citizen profile linked with verified demo credentials. Redirecting to your citizen dashboard...
                </p>
              </div>

              <div className="rounded-xl bg-navy-950/80 p-3 font-mono text-[11px] text-cyan-300 border border-white/10">
                AUTH_METHOD: SIMULATED_DIGILOCKER
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
