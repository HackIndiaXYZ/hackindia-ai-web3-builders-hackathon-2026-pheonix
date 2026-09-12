import React from "react";
import { Boxes, ExternalLink, ShieldCheck } from "lucide-react";

export function AuditorBlockchain() {
  const blocks = [
    { height: 19482714, hash: "0x8f2a74c109e2b4f91d847c2098b1a3e", txCount: 14, gasUsed: "1,248,190", miner: "Validator 0x12" },
    { height: 19482713, hash: "0x3e90a1b874cb10e42d765fa89012cd3", txCount: 8, gasUsed: "841,200", miner: "Validator 0x04" },
    { height: 19482712, hash: "0x7d19c04fe881920acb17482910394af", txCount: 22, gasUsed: "1,894,030", miner: "Validator 0x09" },
  ];

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Blockchain Settlement & Consensus Ledger</h1>
        <p className="mt-1 text-xs text-[#475467]">
          Live synchronization with Ethereum L2 smart contract state anchor for title deed NFTs.
        </p>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-[#101828]">
            <Boxes className="h-4 w-4 text-[#0E7090]" />
            <span>Latest Consensus Blocks</span>
          </div>
          <span className="text-xs text-[#027A48] font-bold">100% Consensus Health</span>
        </div>

        <div className="divide-y divide-[#EAECF0]">
          {blocks.map((b) => (
            <div key={b.height} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="flex items-center gap-2 font-mono font-bold text-[#0E7090]">
                  <span>Block #{b.height}</span>
                  <span className="text-[#667085] font-normal font-sans">({b.txCount} transactions)</span>
                </div>
                <div className="font-mono text-[11px] text-[#475467] mt-0.5">Hash: {b.hash}...</div>
              </div>
              <div className="text-right text-xs">
                <span className="text-[#667085]">Gas: {b.gasUsed}</span>
                <span className="block text-[11px] text-[#101828] font-mono">{b.miner}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuditorBlockchain;
