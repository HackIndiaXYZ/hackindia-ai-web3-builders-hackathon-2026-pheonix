import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  User,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Shield,
  FileCheck
} from "lucide-react";

export function Account() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Header */}
      <div className="border-b border-[#EAECF0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Citizen Identity & Credential Console
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Authenticated identity, permissions, and credential status from the registry session.
          </p>
        </div>

      </div>

      {/* Identity Card */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-[#EAECF0] pb-5">
          <div className="h-16 w-16 rounded-full bg-[#0B3A67] text-white flex items-center justify-center font-bold text-xl">
            {user?.name?.slice(0, 2).toUpperCase() || "CZ"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#101828]">{user?.name}</h2>
              <span className="rounded-full bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] px-2.5 py-0.5 text-[10px] font-bold uppercase">
                {user?.identity_status || "VERIFIED"}
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">{user?.organization || "Independent Citizen Landholder"}</p>
          </div>
        </div>

        {/* Profile Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Unique Citizen ID:</span>
            <span className="font-mono font-bold text-[#101828]">{user?.id}</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Official Email:</span>
            <span className="font-semibold text-[#101828]">{user?.email}</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Account Status:</span>
            <span className={`font-bold ${user?.account_status === "DECEASED" ? "text-[#B42318]" : "text-[#027A48]"}`}>
              {user?.account_status || "ACTIVE"}
            </span>
          </div>
        </div>

        {/* Assigned Roles */}
        <div>
          <span className="text-xs font-bold text-[#344054] block mb-2">Assigned Portal Roles:</span>
          <div className="flex flex-wrap gap-2">
            {(user?.roles || ["OWNER"]).map((r) => (
              <span
                key={r}
                className="px-3 py-1 rounded-md bg-[#EFF8FF] text-[#0B3A67] border border-[#B9D5F4] text-xs font-bold font-mono"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Masked Wallet */}
        <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#EAECF0] space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-[#101828]">
            <Wallet className="h-4 w-4 text-[#0B3A67]" />
            <span>Cryptographic Title Wallet (Ethereum Sovereign Identity)</span>
          </div>
          <div className="font-mono text-xs text-[#0B3A67] bg-white p-2.5 rounded-lg border border-[#EAECF0] break-all">
            {user?.wallet || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"}
          </div>
          <p className="text-[11px] text-[#667085]">
            Hardware-backed sovereign key for signing statutory deed petitions and minting on-chain title receipts.
          </p>
        </div>

        {/* Permissions List */}
        <div>
          <span className="text-xs font-bold text-[#344054] block mb-2">Statutory Permissions:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(user?.permissions && user.permissions.length > 0 ? user.permissions : [
              "CAN_VIEW_OWNED_TITLES",
              "CAN_ISSUE_SELL_TOKENS",
              "CAN_APPROVE_TRANSFERS",
              "CAN_RECEIVE_DEED_NOTICES"
            ]).map((perm, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-[#EAECF0] bg-white flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#027A48]" />
                <span className="font-mono text-[11px] text-[#344054]">{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;
