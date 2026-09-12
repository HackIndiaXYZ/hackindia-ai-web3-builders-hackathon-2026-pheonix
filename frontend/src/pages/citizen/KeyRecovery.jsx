import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  RotateCcw,
  Building2,
  KeyRound,
  Lock,
  ArrowRight
} from "lucide-react";

export function KeyRecovery() {
  const { user } = useAuth();

  // Simulated cooling-off timer (4 days, 14 hours, 32 minutes, 10 seconds)
  const [secondsLeft, setSecondsLeft] = useState(397930);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const days = Math.floor(secondsLeft / (3600 * 24));
  const hours = Math.floor((secondsLeft % (3600 * 24)) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">
          Lost Owner Key Recovery & Cooling-Off Desk
        </h1>
        <p className="mt-1 text-xs text-[#475467]">
          Statutory credential re-issuance under Sub-Registrar biometric verification and mandatory cooling-off period.
        </p>
      </div>

      {/* SCN-13: Key Recovery Warning Banner */}
      <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-5 text-xs text-[#026AA2] space-y-2">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 text-[#0284C7] mt-0.5" />
          <div>
            <span className="font-bold text-sm text-[#0C4A6E]">
              STATUTORY COOLING-OFF ACTIVE (SCN-13)
            </span>
            <p className="mt-1 text-[#082F49] leading-relaxed">
              Parcel <Link to="/citizen/properties/UP-NOI-0012-KEY-RECOVERY" className="font-mono font-bold text-[#0B3A67] underline">UP-NOI-0012-KEY-RECOVERY</Link> is currently undergoing owner credential rotation.
              To prevent fraudulent transfers following social engineering or SIM swaps, a mandatory <strong>7-day cooling-off period</strong> is enforced before new signing credentials are activated.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Countdown Card */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-6 text-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Cooling-Off Period Remaining
          </span>
          <div className="mt-4 flex items-center justify-center gap-3 font-mono">
            <div className="rounded-xl bg-[#F8FAFC] border border-[#EAECF0] p-4 min-w-[72px]">
              <span className="text-3xl font-bold text-[#0B3A67]">{days}</span>
              <span className="block text-[10px] text-[#667085] uppercase mt-1">Days</span>
            </div>
            <span className="text-2xl font-bold text-[#D0D5DD]">:</span>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#EAECF0] p-4 min-w-[72px]">
              <span className="text-3xl font-bold text-[#0B3A67]">{String(hours).padStart(2, "0")}</span>
              <span className="block text-[10px] text-[#667085] uppercase mt-1">Hours</span>
            </div>
            <span className="text-2xl font-bold text-[#D0D5DD]">:</span>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#EAECF0] p-4 min-w-[72px]">
              <span className="text-3xl font-bold text-[#0B3A67]">{String(minutes).padStart(2, "0")}</span>
              <span className="block text-[10px] text-[#667085] uppercase mt-1">Mins</span>
            </div>
            <span className="text-2xl font-bold text-[#D0D5DD]">:</span>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#EAECF0] p-4 min-w-[72px]">
              <span className="text-3xl font-bold text-[#0B3A67]">{String(seconds).padStart(2, "0")}</span>
              <span className="block text-[10px] text-[#667085] uppercase mt-1">Secs</span>
            </div>
          </div>
        </div>

        {/* Security Checklist */}
        <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs pt-2">
          <div className="p-3 bg-[#ECFDF3] rounded-lg border border-[#A6F4C5] text-[#027A48] space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>Biometric Re-verification: PASSED</span>
            </div>
            <p className="text-[11px] text-[#054F31]">
              Owner identity verified in-person at Noida Sub-Registry with Aadhaar Iris Match.
            </p>
          </div>

          <div className="p-3 bg-[#FEF3F2] rounded-lg border border-[#FECDCA] text-[#B42318] space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Lock className="h-4 w-4" />
              <span>Conveyance Actions: LOCKED</span>
            </div>
            <p className="text-[11px] text-[#7A271A]">
              Sell key issuance and deed transfers remain disabled until countdown elapses.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#EAECF0]">
          <Link
            to="/citizen/my-properties"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3A67] hover:underline"
          >
            <span>Return to Registered Properties</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default KeyRecovery;
