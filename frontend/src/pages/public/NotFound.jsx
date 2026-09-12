import React from "react";
import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-[#1D2939]">
      <div className="w-full max-w-md rounded-2xl border border-[#D0D5DD] bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF8FF] text-[#175CD3]">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <span className="inline-block rounded-full bg-[#EFF8FF] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#175CD3]">
          404 Not Found
        </span>

        <h1 className="mt-3 text-2xl font-bold text-[#101828]">Page or Record Not Found</h1>
        <p className="mt-2 text-sm text-[#475467] leading-relaxed">
          The requested cadastral record, portal URL, or transfer petition could not be located in the TitleLock synthetic registry directory.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to="/"
            className="w-full rounded-lg bg-[#0B3A67] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#082949] transition-colors"
          >
            Return to Public Explorer
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
