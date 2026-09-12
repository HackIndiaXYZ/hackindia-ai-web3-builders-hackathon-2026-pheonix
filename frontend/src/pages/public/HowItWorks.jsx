import React from "react";
import { Link } from "react-router-dom";
import { GovHeader } from "../../components/GovHeader.jsx";
import { SideNav } from "../../components/SideNav.jsx";
import { ShieldCheck, KeyRound, Database, FileCheck, ArrowRight, Lock } from "lucide-react";

/**
 * HowItWorks: Public architectural & statutory explainer.
 */
export function HowItWorks() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F9FC]">
      <GovHeader portal="public" />

      <div className="flex flex-1 overflow-hidden">
        <SideNav portal="public" />

        <main className="flex-1 overflow-y-auto p-6 sm:p-10 text-left">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-slide-up">
            {/* Header Banner */}
            <div>
              <span className="rounded-full bg-[#F0FDFA] border border-[#99F6E4] px-3 py-1 text-xs font-semibold text-[#0F766E] uppercase tracking-wider">
                System Architecture & Privacy Principles
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#101828]">
                How TitleLock Protects Land Titles
              </h1>
              <p className="mt-2 text-sm text-[#475467] leading-relaxed max-w-2xl">
                TitleLock unifies rule-based cadastral fraud detection, statutory data minimisation, and cryptographic transfer authorisations to safeguard citizen land records.
              </p>
            </div>

            {/* Core Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pillar 1 */}
              <div className="rounded-lg border border-[#D0D5DD] bg-white p-6 shadow-sm hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B3A67] text-white mb-4">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[#101828]">
                  1. Statutory Data Minimisation
                </h3>
                <p className="mt-2 text-xs text-[#475467] leading-relaxed">
                  Public cadastral searches expose only base attributes (ULPIN, survey numbers, boundary polygons, and registered owners). Sensitive financial encumbrances, risk scores, and succession records are strictly access-controlled.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="rounded-lg border border-[#D0D5DD] bg-white p-6 shadow-sm hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F766E] text-white mb-4">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[#101828]">
                  2. Cryptographic Sell Keys
                </h3>
                <p className="mt-2 text-xs text-[#475467] leading-relaxed">
                  Owners generate single-use, 24-hour expiring authorization keys bound to a specific parcel and named recipient. The system verifies SHA-256 digests without ever storing plaintext credentials.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="rounded-lg border border-[#D0D5DD] bg-white p-6 shadow-sm hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#B54708] text-white mb-4">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[#101828]">
                  3. Automated Cadastral Guardrails
                </h3>
                <p className="mt-2 text-xs text-[#475467] leading-relaxed">
                  Polygon geometry overlap detection (SAT), area mismatch analysis, duplicate title verification, and velocity checks prevent illegal double-registration before records reach the registrar.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="rounded-lg border border-[#D0D5DD] bg-white p-6 shadow-sm hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#101828] text-white mb-4">
                  <FileCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[#101828]">
                  4. Sub-Registrar Audited Commitment
                </h3>
                <p className="mt-2 text-xs text-[#475467] leading-relaxed">
                  All property transfers require verified owner consent and formal official review. Every approval or administrative override is immutably logged with employee credentials.
                </p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="rounded-lg border border-[#D0D5DD] bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-[#101828]">
                  Are you a land titleholder or buyer?
                </h4>
                <p className="text-xs text-[#667085] mt-0.5">
                  Sign in to inspect your full encumbrance status or issue a transfer authorization key.
                </p>
              </div>
              <Link
                to="/auth/citizen"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] hover-lift shadow-sm shrink-0"
              >
                <span>Citizen Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
