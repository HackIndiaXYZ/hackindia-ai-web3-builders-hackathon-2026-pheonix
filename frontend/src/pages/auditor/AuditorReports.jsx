import React from "react";
import { FileCheck, Download, Printer } from "lucide-react";

export function AuditorReports() {
  const reports = [
    { title: "Statutory Title Health Audit Q1-2026", date: "2026-03-10", size: "2.4 MB", type: "PDF" },
    { title: "Boundary Overlap & Encroachment Synthesis", date: "2026-02-28", size: "4.1 MB", type: "PDF" },
    { title: "Administrative Overrides Scrutiny Dossier", date: "2026-02-15", size: "1.8 MB", type: "PDF" },
  ];

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Statutory Audit Reports</h1>
        <p className="mt-1 text-xs text-[#475467]">
          Certified compliance dossiers prepared for the State Revenue Department and Comptroller.
        </p>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <div className="divide-y divide-[#EAECF0]">
          {reports.map((r, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <FileCheck className="h-5 w-5 text-[#0E7090]" />
                <div>
                  <div className="font-bold text-[#101828]">{r.title}</div>
                  <div className="text-[#667085] text-[11px]">Generated: {r.date} · {r.size}</div>
                </div>
              </div>
              <button
                onClick={() => alert(`Downloading statutory report: ${r.title}`)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#D0D5DD] px-3 py-1.5 font-semibold text-[#344054] hover:bg-[#F8FAFC]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export {r.type}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuditorReports;
