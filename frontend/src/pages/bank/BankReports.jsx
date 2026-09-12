import React from "react";
import { FileSpreadsheet, Download, Printer } from "lucide-react";

export function BankReports() {
  const reports = [
    { id: "REP-2026-001", title: "CERSAI Mortgage Valuation Report Q1", date: "2026-03-01", size: "1.9 MB" },
    { id: "REP-2026-002", title: "Non-Encumbrance Certificate Dossier", date: "2026-02-20", size: "3.2 MB" },
    { id: "REP-2026-003", title: "Collateral Risk & Injunction Audit", date: "2026-02-10", size: "2.1 MB" },
  ];

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Lien & Encumbrance Clearance Reports</h1>
        <p className="mt-1 text-xs text-[#475467]">
          Statutory title clearance certificates generated for loan underwriting and mortgage disbursement.
        </p>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <div className="divide-y divide-[#EAECF0]">
          {reports.map((r) => (
            <div key={r.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-[#027A48]" />
                <div>
                  <div className="font-bold text-[#101828]">{r.title}</div>
                  <div className="text-[#667085] text-[11px]">Dossier ID: {r.id} · {r.date} · {r.size}</div>
                </div>
              </div>

              <button
                onClick={() => alert(`Downloading mortgage report: ${r.title}`)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#D0D5DD] px-3 py-1.5 font-semibold text-[#344054] hover:bg-[#F8FAFC]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BankReports;
