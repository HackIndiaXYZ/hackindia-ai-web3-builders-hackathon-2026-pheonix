import React, { useState } from "react";
import { Info, ShieldAlert, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

/**
 * InfoNote: Purpose-limitation disclosures, statutory caveats, and alerts.
 */
export function InfoNote({
  title = "Notice",
  children,
  type = "info", // info | warning | danger | success
  collapsible = false,
  popover = false,
}) {
  const [isOpen, setIsOpen] = useState(!collapsible);

  const styleMap = {
    info: {
      bg: "bg-[#F8FAFC]",
      border: "border-[#D0D5DD]",
      text: "text-[#344054]",
      title: "text-[#101828]",
      icon: Info,
      iconColor: "text-[#0B3A67]",
    },
    warning: {
      bg: "bg-[#FFFBEB]",
      border: "border-[#FDE68A]",
      text: "text-[#78350F]",
      title: "text-[#92400E]",
      icon: AlertTriangle,
      iconColor: "text-[#B54708]",
    },
    danger: {
      bg: "bg-[#FEF2F2]",
      border: "border-[#FECACA]",
      text: "text-[#991B1B]",
      title: "text-[#B42318]",
      icon: ShieldAlert,
      iconColor: "text-[#B42318]",
    },
    success: {
      bg: "bg-[#F0FDFA]",
      border: "border-[#99F6E4]",
      text: "text-[#115E59]",
      title: "text-[#0F766E]",
      icon: CheckCircle,
      iconColor: "text-[#0F766E]",
    },
  };

  const current = styleMap[type] || styleMap.info;
  const Icon = current.icon;

  if (popover) {
    return (
      <div className="relative inline-block group">
        <button
          type="button"
          aria-label={title}
          className="inline-flex items-center text-[#667085] hover:text-[#0B3A67] focus:outline-none"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-64 rounded-lg border border-[#D0D5DD] bg-white p-2.5 text-xs text-[#344054] shadow-md group-hover:block z-50">
          <div className="font-semibold text-[#101828] mb-1">{title}</div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 text-left text-xs ${current.bg} ${current.border}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${current.iconColor}`} />
        <div className="flex-1">
          {title && <div className={`font-semibold mb-0.5 ${current.title}`}>{title}</div>}
          <div className={`leading-relaxed ${current.text}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
