import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Accessible password input with show/hide toggle
 */
export function PasswordInput({
  id,
  name = "password",
  value,
  onChange,
  placeholder = "••••••••",
  label = "Password",
  required = true,
  disabled = false,
  autoComplete = "current-password",
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5 text-left">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-medium text-slate-300">
            {label}
          </label>
        </div>
      )}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-white/10 bg-navy-950/80 px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:bg-navy-950"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
