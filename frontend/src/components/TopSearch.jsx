import React, { useState, useRef, useEffect } from "react";
import { Search, X, MapPin } from "lucide-react";
import { StatusChip } from "./StatusChip.jsx";

/**
 * TopSearch component: Centered pill search with suggestions dropdown.
 * Matches ulpin, survey_number, title_number, locality, district, owners[].name.
 */
export function TopSearch({ parcels = [], onSelectParcel, isPublic = true }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);

  // Filter parcels based on search query
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
        const matchOwner = (p.owners || []).some((o) =>
          o.name?.toLowerCase().includes(q)
        );
        return (
          matchUlpin ||
          matchSurvey ||
          matchTitle ||
          matchLocality ||
          matchDistrict ||
          matchOwner
        );
      })
      .slice(0, 8); // Max 8 suggestions
  }, [parcels, query]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
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

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Search Input Pill */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Search className="h-4 w-4 text-[#667085]" />
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
          placeholder="Search by ULPIN, Survey No, Title No, Owner Name, Locality..."
          className="w-full rounded-full border border-[#D0D5DD] bg-white py-2.5 pl-10 pr-10 text-sm text-[#101828] placeholder-[#667085] shadow-sm transition-all focus:border-[#0B3A67] focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20"
          aria-label="Search Land Registry"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#667085] hover:text-[#101828]"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && filteredParcels.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-[#D0D5DD] bg-white shadow-lg py-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wider border-b border-[#D0D5DD] bg-[#F7F9FC]">
            Matching Land Parcels ({filteredParcels.length})
          </div>
          <ul role="listbox" className="divide-y divide-[#F2F4F7]">
            {filteredParcels.map((parcel, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <li
                  key={parcel.ulpin}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(parcel)}
                  className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-left transition-colors ${
                    isSelected ? "bg-[#F7F9FC]" : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#0B3A67]">
                        {parcel.ulpin}
                      </span>
                      <StatusChip
                        status={parcel.title_status}
                        isPublic={isPublic}
                        size="xs"
                      />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#344054]">
                      <MapPin className="h-3 w-3 text-[#667085] shrink-0" />
                      <span className="truncate font-medium">{parcel.locality}</span>
                      <span className="text-[#667085]">·</span>
                      <span className="text-[#667085] truncate">{parcel.district}</span>
                    </div>
                    {parcel.owners?.[0] && (
                      <div className="text-[11px] text-[#667085] truncate">
                        Owner: {parcel.owners[0].name}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <span className="font-mono text-xs text-[#344054]">
                      {parcel.area_sqm} m²
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isOpen && query.trim().length >= 2 && filteredParcels.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-[#D0D5DD] bg-white p-4 text-center text-xs text-[#667085] shadow-lg">
          No matching land parcels found for "{query}". Try a ULPIN (e.g. UP-NOI-0001) or owner name.
        </div>
      )}
    </div>
  );
}
