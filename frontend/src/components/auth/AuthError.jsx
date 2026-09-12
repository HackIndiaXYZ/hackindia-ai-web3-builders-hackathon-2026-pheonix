import React from "react";
import { AlertCircle, X } from "lucide-react";

/**
 * Styled error banner for authentication feedback
 */
export function AuthError({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 shadow-sm animate-in fade-in"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
        <span className="leading-relaxed">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-rose-400 hover:text-rose-200 transition-colors p-0.5"
          aria-label="Dismiss error"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
