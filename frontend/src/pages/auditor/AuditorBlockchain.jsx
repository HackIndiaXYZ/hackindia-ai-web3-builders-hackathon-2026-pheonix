import React, { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { blockchainService } from "../../services/liveData.js";
import { useAuth } from "../../context/AuthContext.jsx";

export function AuditorBlockchain() {
  const { token } = useAuth();
  const [activity, setActivity] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([blockchainService.activity(token), blockchainService.health(token)])
      .then(([events, status]) => { setActivity(events || []); setHealth(status); })
      .catch((err) => setError(err.message));
  }, [token]);

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
          <span className="text-xs text-[#027A48] font-bold">{health?.status || "Loading"}</span>
        </div>

        <div className="divide-y divide-[#EAECF0]">
          {error && <div className="p-4 text-xs text-[#B42318]">{error}</div>}
          {!error && !activity.length && <div className="p-4 text-xs text-[#667085]">No indexed MST events available.</div>}
          {activity.map((event) => (
            <div key={`${event.tx_hash}-${event.block_number}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="flex items-center gap-2 font-mono font-bold text-[#0E7090]">
                  <span>{event.event_type}</span>
                  <span className="text-[#667085] font-normal font-sans">Block #{event.block_number}</span>
                </div>
                <div className="font-mono text-[11px] text-[#475467] mt-0.5">Tx: {event.tx_hash}</div>
              </div>
              <div className="text-right text-xs">
                <span className="text-[#027A48]">Indexed</span>
                <span className="block text-[11px] text-[#101828] font-mono">{event.parcel_id || "System"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuditorBlockchain;
