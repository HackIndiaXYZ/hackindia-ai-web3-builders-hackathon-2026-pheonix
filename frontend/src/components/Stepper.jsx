import React from "react";
import { Check, AlertCircle, Clock, ShieldCheck, FileCheck } from "lucide-react";

/**
 * Stepper Component for Transfer State Machine:
 * INITIATED → RISK CHECK → OWNER CONSENT → REGISTRAR REVIEW → SETTLED / BLOCKED / EXPIRED
 */
export function Stepper({ currentStep = "INITIATED", status = "PENDING" }) {
  const steps = [
    { id: "INITIATED", label: "Initiated", number: 1 },
    { id: "RISK_CHECK", label: "Risk Check", number: 2 },
    { id: "OWNER_CONSENT", label: "Owner Consent", number: 3 },
    { id: "REGISTRAR_REVIEW", label: "Registrar Review", number: 4 },
    { id: "SETTLED", label: "Settled", number: 5 },
  ];

  // Map arbitrary timeline status or request state to step index
  const getStepIndex = (step) => {
    const s = (step || "").toUpperCase();
    if (s === "INITIATED" || s === "REQUESTED") return 0;
    if (s === "RISK_CHECK" || s === "RISK_CLEARED" || s === "DOCUMENTS_VERIFIED") return 1;
    if (s === "OWNER_CONSENT" || s === "OWNER_APPROVED" || s === "AWAITING_OWNER") return 2;
    if (s === "REGISTRAR_REVIEW" || s === "AWAITING_REGISTRAR") return 3;
    if (s === "SETTLED" || s === "COMPLETED" || s === "BLOCKED" || s === "REJECTED" || s === "EXPIRED") return 4;
    return 0;
  };

  const currentIndex = getStepIndex(currentStep);
  const isTerminalBlocked = status === "BLOCKED" || status === "REJECTED";

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          let circleBg = "bg-white border-2 border-[#D0D5DD] text-[#667085]";
          let labelColor = "text-[#667085]";

          if (isDone) {
            circleBg = "bg-[#0F766E] border-2 border-[#0F766E] text-white";
            labelColor = "text-[#0F766E] font-semibold";
          } else if (isCurrent) {
            if (isTerminalBlocked && idx === steps.length - 1) {
              circleBg = "bg-[#B42318] border-2 border-[#B42318] text-white";
              labelColor = "text-[#B42318] font-semibold";
            } else {
              circleBg = "bg-[#0B3A67] border-2 border-[#0B3A67] text-white shadow-sm";
              labelColor = "text-[#0B3A67] font-semibold";
            }
          }

          return (
            <React.Fragment key={step.id}>
              {/* Step Node */}
              <div className="flex flex-col items-center group relative">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors ${circleBg}`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  ) : isCurrent && isTerminalBlocked ? (
                    <AlertCircle className="h-4 w-4 stroke-[2.5]" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <div className={`mt-1.5 text-center text-[11px] whitespace-nowrap ${labelColor}`}>
                  {step.id === "SETTLED" && isTerminalBlocked ? "Blocked" : step.label}
                </div>
              </div>

              {/* Connecting Line */}
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    idx < currentIndex ? "bg-[#0F766E]" : "bg-[#D0D5DD]"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
