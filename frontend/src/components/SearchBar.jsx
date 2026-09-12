import React, { useState, useEffect, useRef } from "react";
import { Search, X, MapPin, User, Tag, ShieldAlert, CheckCircle2 } from "lucide-react";
import { formatArea } from "../lib/utils.js";
import { getStatusBadgeProps } from "../lib/parcelColors.js";

/**
 * Floating pill search bar (top-center)
 * Matches: ulpin, survey_number, locality, district, owners[].name,
 * nominees[].name, title_status, risk_status, map_tags[].
 */
export function SearchBar({ parcels = [], onSelectParcel, selectedParcelId }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter parcels based on query
  const matchingResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results = [];

    for (const parcel of parcels) {
      const matchReasons = [];

      if (parcel.ulpin?.toLowerCase().includes(q)) {
        matchReasons.push({ type: "ulpin", text: `ULPIN: ${parcel.ulpin}` });
      }
      if (parcel.survey_number?.toLowerCase().includes(q)) {
        matchReasons.push({ type: "survey", text: `Survey: ${parcel.survey_number}` });
      }
      if (parcel.locality?.toLowerCase().includes(q)) {
        matchReasons.push({ type: "location", text: `Locality: ${parcel.locality}` });
      }
      if (parcel.district?.toLowerCase().includes(q)) {
        matchReasons.push({ type: "location", text: `District: ${parcel.district}` });
      }
      if (parcel.title_status?.toLowerCase().includes(q)) {
        matchReasons.push({ type: "status", text: `Status: ${parcel.title_status}` });
      }
      if (parcel.risk_status?.toLowerCase().includes(q)) {
        matchReasons.push({ type: "risk", text: `Risk: ${parcel.risk_status}` });
      }

      // Check owners
      if (Array.isArray(parcel.owners)) {
        for (const owner of parcel.owners) {
          if (owner.name?.toLowerCase().includes(q)) {
            matchReasons.push({ type: "owner", text: `Owner: ${owner.name}` });
          }
        }
      }

      // Check nominees
      if (Array.isArray(parcel.nominees)) {
        for (const nominee of parcel.nominees) {
          if (nominee.name?.toLowerCase().includes(q)) {
            matchReasons.push({ type: "nominee", text: `Nominee: ${nominee.name}` });
          }
        }
      }

      // Check map tags
      if (Array.isArray(parcel.map_tags)) {
        for (const tag of parcel.map_tags) {
          if (tag.toLowerCase().includes(q)) {
            matchReasons.push({ type: "tag", text: `#${tag}` });
          }
        }
      }

      if (matchReasons.length > 0) {
        results.push({
          parcel,
          reasons: matchReasons,
        });
      }
    }

    return results.slice(0, 8); // Limit to top 8 suggestions
  }, [query, parcels]);

  const handleSelect = (parcel) => {
    setIsOpen(false);
    setQuery("");
    if (onSelectParcel) {
      onSelectParcel(parcel);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || matchingResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % matchingResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + matchingResults.length) % matchingResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matchingResults[selectedIndex]) {
        handleSelect(matchingResults[selectedIndex].parcel);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 select-none"
    >
      {/* Floating Pill Search Bar */}
      <div className="relative flex items-center rounded-full border border-white/15 bg-navy-900/85 px-4 py-2.5 shadow-glass backdrop-blur-xl transition-all duration-200 focus-within:border-cyan-400 focus-within:shadow-cyan-glow-sm hover:border-white/25">
        <Search className="h-4 w-4 shrink-0 text-cyan-400 mr-2.5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search by ULPIN, Survey No, Owner, Nominee, Locality, Status or #Tag..."
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 outline-none font-sans"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="ml-2 hidden sm:flex items-center gap-1 shrink-0">
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">ESC</kbd>
        </div>
      </div>

      {/* Live Suggestions Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-4 right-4 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-navy-900/95 shadow-glass backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200 max-h-[420px] overflow-y-auto">
          {matchingResults.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              No registered parcels match <span className="text-cyan-400 font-mono">"{query}"</span>
            </div>
          ) : (
            <div className="p-1.5 space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Matching Records ({matchingResults.length})</span>
                <span>Press Enter to view</span>
              </div>

              {matchingResults.map(({ parcel, reasons }, index) => {
                const statusBadge = getStatusBadgeProps(parcel.title_status);
                const isItemActive = index === selectedIndex;
                const isCurrentlySelected = parcel.id === selectedParcelId;

                return (
                  <div
                    key={parcel.id}
                    onClick={() => handleSelect(parcel)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 cursor-pointer transition-all duration-150 ${
                      isItemActive
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-white"
                        : "text-slate-300 hover:bg-white/5 border border-transparent"
                    } ${isCurrentlySelected ? "ring-1 ring-cyan-400" : ""}`}
                  >
                    {/* Left details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-300 tracking-wide">
                          {parcel.ulpin}
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-xs text-slate-300 truncate">
                          {parcel.survey_number}
                        </span>
                      </div>

                      {/* Locality and primary owner */}
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
                          <span className="truncate">{parcel.locality}, {parcel.district}</span>
                        </div>
                        {parcel.owners?.[0] && (
                          <>
                            <span>·</span>
                            <div className="flex items-center gap-1 truncate">
                              <User className="h-3 w-3 shrink-0 text-slate-500" />
                              <span className="truncate">{parcel.owners[0].name}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Match reasons pills */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {reasons.slice(0, 3).map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-cyan-200"
                          >
                            {r.text}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Area & Status Badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-medium border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                      >
                        {statusBadge.label}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {formatArea(parcel.area_sqm)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
