import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, X, MapPin, Shield, HelpCircle, ChevronDown, Landmark, FileSpreadsheet } from "lucide-react";
import { StatusChip } from "./StatusChip.jsx";

/**
 * Floating Public Navbar for Route /
 * LEFT: TitleLock logo/name + PUBLIC DEMO label
 * CENTER: Floating pill search (Search ULPIN, survey number, locality or owner)
 * RIGHT: Explore, How it works, Citizen login, Official Portals dropdown
 */
export function PublicNav({
  parcels = [],
  onSelectParcel,
  onOpenHowItWorks,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const portalsMenuRef = useRef(null);

  const filteredParcels = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    return parcels
      .filter((p) => {
        const matchUlpin = p.ulpin?.toLowerCase().includes(q);
        const matchSurvey = p.survey_number?.toLowerCase().includes(q);
        const matchTitle = p.title_number?.toLowerCase().includes(q);
        const matchLocality = p.locality?.toLowerCase().includes(q);
        const matchDistrict = p.district?.toLowerCase().includes(q);
        const matchState = p.state?.toLowerCase().includes(q);
        const matchOwner = (p.owners || []).some((o) =>
          o.name?.toLowerCase().includes(q)
        );
        const matchTags = (p.map_tags || []).some((t) =>
          t.toLowerCase().includes(q)
        );

        return (
          matchUlpin ||
          matchSurvey ||
          matchTitle ||
          matchLocality ||
          matchDistrict ||
          matchState ||
          matchOwner ||
          matchTags
        );
      })
      .slice(0, 7);
  }, [parcels, query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
      if (
        portalsMenuRef.current &&
        !portalsMenuRef.current.contains(e.target)
      ) {
        setPortalsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen || filteredParcels.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredParcels.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredParcels.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredParcels.length) {
        handleSelect(filteredParcels[selectedIndex]);
      } else if (filteredParcels.length > 0) {
        handleSelect(filteredParcels[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (parcel) => {
    onSelectParcel(parcel);
    setQuery(parcel.ulpin);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <header className="public-navbar flex items-center justify-between gap-3 pointer-events-none select-none">
      {/* LEFT: TitleLock Logo/Name + PUBLIC DEMO label */}
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-[#090d16]/90 px-3.5 py-2 shadow-2xl backdrop-blur-md">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B3A67] text-white">
          <Shield className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight text-white">
            TitleLock
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider text-slate-300 border border-white/10 uppercase">
            PUBLIC DEMO
          </span>
        </div>
      </div>

      {/* CENTER: Floating Pill Search Bar */}
      <div
        ref={searchContainerRef}
        className="pointer-events-auto relative flex-1 max-w-lg mx-2"
      >
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search ULPIN, survey number, locality or owner"
            className="w-full rounded-full border border-white/20 bg-[#090d16]/90 py-2 pl-10 pr-9 text-xs text-white placeholder-slate-400 shadow-2xl backdrop-blur-md focus:border-[#1769AA] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/30 transition-all"
            aria-label="Search ULPIN, survey number, locality or owner"
            role="combobox"
            aria-expanded={isOpen}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
              aria-label="Clear search query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {isOpen && filteredParcels.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-[#090d16]/95 p-1.5 shadow-2xl backdrop-blur-lg z-50">
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10 mb-1">
              Cadastral Matches ({filteredParcels.length})
            </div>
            <ul role="listbox" className="space-y-0.5">
              {filteredParcels.map((parcel, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li
                    key={parcel.ulpin}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(parcel)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                      isSelected ? "bg-white/15 text-white" : "hover:bg-white/10 text-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {parcel.ulpin}
                        </span>
                        <StatusChip
                          status={parcel.title_status}
                          isPublic={true}
                          size="xs"
                        />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                        <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="truncate">{parcel.locality}</span>
                        <span>·</span>
                        <span className="truncate">{parcel.district}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* RIGHT: Explore, How it works, Citizen login, Official Portals */}
      <nav
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-[#090d16]/90 p-1.5 shadow-2xl backdrop-blur-md"
        aria-label="Public Navigation"
      >
        <button
          onClick={onOpenHowItWorks}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">How it works</span>
        </button>

        <Link
          to="/auth/citizen"
          className="rounded-full bg-[#0B3A67] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA] transition-colors shadow-sm"
        >
          Citizen Login
        </Link>

        {/* Official Portals Dropdown */}
        <div ref={portalsMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setPortalsOpen(!portalsOpen)}
            className="flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <span>Officials</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {portalsOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/15 bg-[#090d16]/95 p-1.5 shadow-2xl backdrop-blur-lg z-50 text-left">
              <Link
                to="/auth/registrar"
                onClick={() => setPortalsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <div className="h-6 w-6 rounded bg-[#0B3A67]/50 flex items-center justify-center text-cyan-400">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold">Sub-Registrar</div>
                  <div className="text-[10px] text-slate-400">Adjudication Desk</div>
                </div>
              </Link>

              <Link
                to="/auth/auditor"
                onClick={() => setPortalsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <div className="h-6 w-6 rounded bg-[#0E7090]/50 flex items-center justify-center text-sky-400">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold">State Auditor</div>
                  <div className="text-[10px] text-slate-400">Ledger Directorate</div>
                </div>
              </Link>

              <Link
                to="/auth/bank"
                onClick={() => setPortalsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <div className="h-6 w-6 rounded bg-[#027A48]/50 flex items-center justify-center text-emerald-400">
                  <Landmark className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold">Bank Officer</div>
                  <div className="text-[10px] text-slate-400">Mortgage & Lien Desk</div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
