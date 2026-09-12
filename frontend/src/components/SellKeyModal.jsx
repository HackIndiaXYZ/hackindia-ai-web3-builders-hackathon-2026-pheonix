import React, { useState } from "react";
import { QrBlock } from "./QrBlock.jsx";
import { InfoNote } from "./InfoNote.jsx";
import { Copy, Check, Download, AlertTriangle, X, KeyRound } from "lucide-react";
import { SELL_KEY_CAVEAT } from "../lib/sellKeys.js";

/**
 * One-time reveal modal for Sell Key.
 * Plaintext key is shown exactly once. Upon closing, it is purged from component memory.
 */
export function SellKeyModal({ keyData, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!keyData) return null;

  const { keyId, keyText, record } = keyData;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const content = `TITLELOCK TRANSFER AUTHORIZATION SELL KEY
--------------------------------------------------------
Key ID:       ${keyId}
Parcel ULPIN: ${record.ulpin}
Owner ID:     ${record.ownerUserId}
Recipient ID: ${record.recipientUserId}
Created At:   ${record.createdAt}
Expires At:   ${record.expiresAt} (TTL: 24 Hours)
Status:       ACTIVE (Single-Use)

KEY TOKEN (DO NOT SHARE PUBLICLY):
${keyText}

--------------------------------------------------------
DISCLAIMER:
${SELL_KEY_CAVEAT}
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SellKey_${record.ulpin}_${keyId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sell-key-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[#D0D5DD] bg-white p-6 shadow-xl animate-fade-slide-up text-left">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#D0D5DD]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B3A67] text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 id="sell-key-title" className="text-base font-semibold text-[#101828]">
                Transfer Sell Key Generated
              </h3>
              <p className="text-xs text-[#667085]">
                Single-use 24-hour cryptographic transfer token
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[#667085] hover:bg-[#F2F4F7] hover:text-[#101828]"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Banner: One-Time Reveal */}
        <div className="mt-4 rounded-md border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#78350F]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#B54708] mt-0.5" />
            <div>
              <span className="font-semibold">This key is shown once. Copy it now.</span>
              <p className="mt-0.5 text-[#92400E]">
                For security, the server and browser store only a SHA-256 digest. Once closed, this plaintext key cannot be recovered or displayed again.
              </p>
            </div>
          </div>
        </div>

        {/* Metadata Summary */}
        <div className="mt-4 space-y-1 rounded-md border border-[#D0D5DD] bg-[#F7F9FC] p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-[#667085]">Authorized Parcel:</span>
            <span className="font-mono font-semibold text-[#0B3A67]">{record.ulpin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#667085]">Recipient User ID:</span>
            <span className="font-mono text-[#344054]">{record.recipientUserId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#667085]">Valid For:</span>
            <span className="font-medium text-[#0F766E]">24 Hours (Single Transfer)</span>
          </div>
        </div>

        {/* Plaintext Key Display with Copy */}
        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-semibold text-[#344054]">
            Plaintext Authorization Token
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={keyText}
              className="w-full rounded-md border border-[#D0D5DD] bg-[#F8FAFC] py-2 pl-3 pr-24 font-mono text-xs text-[#101828] select-all focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="absolute right-1 top-1 inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-[#0B3A67] border border-[#D0D5DD] hover:bg-[#F8FAFC] focus:outline-none"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#0F766E]" />
                  <span className="text-[#0F766E]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Code Block */}
        <div className="mt-4 flex justify-center">
          <QrBlock value={keyText} size={140} label={keyId} />
        </div>

        {/* Always-visible statutory caveat */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-[#667085] leading-normal italic">
            "{SELL_KEY_CAVEAT}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5 pt-4 border-t border-[#D0D5DD]">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#D0D5DD] bg-white px-3 py-2 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC] focus:outline-none"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .txt</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] focus:outline-none shadow-sm"
          >
            I have saved this key
          </button>
        </div>
      </div>
    </div>
  );
}
