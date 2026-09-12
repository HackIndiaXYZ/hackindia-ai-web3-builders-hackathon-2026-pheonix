import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useLiveAudit, useLiveParcels } from "../../services/liveData.js";
import { Map, MapControls, fitAllParcels } from "../../components/MapExplorer.jsx";
import { PublicNav } from "../../components/PublicNav.jsx";
import { MapLegend } from "../../components/MapLegend.jsx";
import { ParcelDrawer } from "./ParcelDrawer.jsx";
import { ParcelTooltip } from "../../components/ParcelTooltip.jsx";
import { ShieldCheck, KeyRound, Database, FileCheck, X, Activity, Layers, AlertCircle, CheckCircle2, Clock } from "lucide-react";

/**
 * Public Route /: Hybrid Visual Design
 * Full-screen Dark 3D Map + Floating Pill Navbar + Left Floating KPI Chips + Floating Legend + Bottom Activity Strip + Floating Controls + White Right Detail Drawer
 */
export function ExplorerPage() {
  const { data: parcels, loading: parcelsLoading, error: parcelsError } = useLiveParcels("");
  const { data: auditEvents, loading: auditLoading, error: auditError } = useLiveAudit("");
  const mapHostRef = useRef(null);
  const navigate = useNavigate();

  const { ulpin: routeUlpin } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUlpin = searchParams.get("ulpin");
  const targetUlpin = routeUlpin || queryUlpin;

  const [mapInstance, setMapInstance] = useState(null);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(true);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [activeLegendFilter, setActiveLegendFilter] = useState(null);

  // Recent public activity feed
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => setRecentEvents(auditEvents.slice(0, 3)), [auditEvents]);

  // Prevent vertical body scrolling on public map
  useEffect(() => {
    document.body.classList.add("public-map-page");
    return () => {
      document.body.classList.remove("public-map-page");
    };
  }, []);

  // Deep linking: auto-select parcel if provided in URL param or query
  useEffect(() => {
    if (targetUlpin && parcels.length > 0) {
      const match = parcels.find(
        (p) => p.ulpin?.toLowerCase() === targetUlpin.toLowerCase()
      );
      if (match) {
        setSelectedParcel(match);
      }
    }
  }, [targetUlpin, parcels]);

  const handleSelectParcel = useCallback(
    (parcel) => {
      setSelectedParcel(parcel);
      setSearchParams({ ulpin: parcel.ulpin });
    },
    [setSearchParams]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedParcel(null);
    if (routeUlpin) {
      navigate("/", { replace: true });
    } else {
      setSearchParams({});
    }
  }, [routeUlpin, navigate, setSearchParams]);

  const handleResetView = useCallback(() => {
    if (mapInstance) {
      fitAllParcels(mapInstance, parcels);
    }
  }, [mapInstance, parcels]);

  const handleResetBearing = useCallback(() => {
    if (mapInstance) {
      mapInstance.easeTo({ bearing: 0, duration: 400 });
    }
  }, [mapInstance]);

  const handleZoomIn = useCallback(() => {
    if (mapInstance) {
      mapInstance.zoomIn({ duration: 250 });
    }
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    if (mapInstance) {
      mapInstance.zoomOut({ duration: 250 });
    }
  }, [mapInstance]);

  // KPI calculations
  const totalParcelsCount = parcels.length;
  const verifiedCount = parcels.filter(
    (p) => p.title_status === "VERIFIED" || p.title_status === "CLEAR"
  ).length;
  const underReviewCount = parcels.filter(
    (p) =>
      p.title_status?.includes("REVIEW") ||
      p.title_status?.includes("ENCUMBRANCE") ||
      p.title_status?.includes("GAP") ||
      p.title_status === "SUCCESSION_PENDING" ||
      p.title_status === "CREDENTIAL_RECOVERY"
  ).length;
  const restrictedCount = totalParcelsCount - verifiedCount - underReviewCount;

  return (
    <div className="public-shell">
      {(parcelsLoading || auditLoading) && <div className="fixed top-4 left-1/2 z-30 -translate-x-1/2 rounded bg-black/80 px-3 py-2 text-xs text-white">Loading live registry data...</div>}
      {(parcelsError || auditError) && <div className="fixed top-4 left-1/2 z-30 -translate-x-1/2 rounded bg-[#B42318] px-3 py-2 text-xs text-white">{parcelsError || auditError}</div>}
      {/* 1. Map Host Canvas Container */}
      <div ref={mapHostRef} className="map-host">
        <Map
          mapHostRef={mapHostRef}
          parcels={parcels}
          selectedParcel={selectedParcel}
          onSelectParcel={handleSelectParcel}
          onParcelHover={setHoverInfo}
          isSatellite={isSatellite}
          isTerrainEnabled={isTerrainEnabled}
          onMapReady={setMapInstance}
        />
      </div>

      {/* 2. Floating Navbar */}
      <PublicNav
        parcels={parcels}
        onSelectParcel={handleSelectParcel}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
      />

      {/* 3. Left Floating KPI Chips */}
      <div className="fixed top-20 left-6 z-20 hidden lg:flex flex-col gap-2 select-none pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/15 bg-[#090d16]/85 px-3 py-2 shadow-2xl backdrop-blur-md">
          <Layers className="h-4 w-4 text-cyan-400" />
          <div className="text-xs">
            <span className="text-slate-400">Total Parcels: </span>
            <span className="font-mono font-bold text-white">{totalParcelsCount}</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-[#090d16]/85 px-3 py-2 shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <div className="text-xs">
            <span className="text-slate-400">Verified: </span>
            <span className="font-mono font-bold text-emerald-400">{verifiedCount}</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-500/30 bg-[#090d16]/85 px-3 py-2 shadow-2xl backdrop-blur-md">
          <Clock className="h-4 w-4 text-amber-400" />
          <div className="text-xs">
            <span className="text-slate-400">Under Review: </span>
            <span className="font-mono font-bold text-amber-400">{underReviewCount}</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-rose-500/30 bg-[#090d16]/85 px-3 py-2 shadow-2xl backdrop-blur-md">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <div className="text-xs">
            <span className="text-slate-400">Restricted: </span>
            <span className="font-mono font-bold text-rose-400">{restrictedCount}</span>
          </div>
        </div>
      </div>

      {/* 4. Floating Map Legend */}
      <MapLegend
        activeFilter={activeLegendFilter}
        onSelectFilter={setActiveLegendFilter}
      />

      {/* 5. Floating Bottom Recent Activity Strip */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-3 rounded-full border border-white/15 bg-[#090d16]/90 px-4 py-2 text-xs shadow-2xl backdrop-blur-md select-none">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-cyan-400">
          <Activity className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span>Latest Activity</span>
        </div>
        <div className="h-3 w-px bg-white/20" />
        {recentEvents.length > 0 ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="font-mono font-semibold text-white">{recentEvents[0].action}</span>
            <span>·</span>
            <span className="font-mono text-cyan-300">{recentEvents[0].ulpin || "CADASTRE"}</span>
            <span>·</span>
            <span className="text-slate-400">{new Date(recentEvents[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">Registry ledger synchronized</span>
        )}
      </div>

      {/* 6. Floating Map Controls */}
      <MapControls
        isTerrainEnabled={isTerrainEnabled}
        onToggleTerrain={() => setIsTerrainEnabled((prev) => !prev)}
        isSatellite={isSatellite}
        onToggleSatellite={() => setIsSatellite((prev) => !prev)}
        onResetView={handleResetView}
        onResetBearing={handleResetBearing}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* 7. Floating Attribution Chip */}
      <div className="attribution-chip">
        © OpenFreeMap © OpenMapTiles © OpenStreetMap contributors ·
        Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community ·
        Terrain: AWS Open Data
      </div>

      {/* 8. Right-Side White Detail Drawer (Strict 13 Allowlisted Fields) */}
      {selectedParcel && (
        <ParcelDrawer
          rawParcel={selectedParcel}
          onClose={handleCloseDrawer}
        />
      )}

      {/* 9. Hover Tooltip */}
      <ParcelTooltip hoverInfo={hoverInfo} />

      {/* 10. How It Works Modal */}
      {isHowItWorksOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-lg border border-[#D0D5DD] bg-white p-6 shadow-2xl animate-fade-slide-up text-left overflow-hidden">
            <div className="-mx-6 -mt-6 mb-5 flex h-[3px] w-[calc(100%+48px)]">
              <div className="w-1/3 bg-[#FF9933]" />
              <div className="w-1/3 bg-[#FFFFFF]" />
              <div className="w-1/3 bg-[#138808]" />
            </div>

            <div className="flex items-center justify-between border-b border-[#D0D5DD] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#101828]">
                  How TitleLock Protects Cadastral Records
                </h3>
                <p className="text-xs text-[#475467]">
                  Public Cadastral Verification & Data Minimisation Architecture
                </p>
              </div>
              <button
                onClick={() => setIsHowItWorksOpen(false)}
                className="rounded-md p-1.5 text-[#667085] hover:bg-[#F2F4F7] hover:text-[#101828]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-[#101828]">
                  <ShieldCheck className="h-4 w-4 text-[#0B3A67]" />
                  <span>1. Statutory Data Minimisation</span>
                </div>
                <p className="text-[#475467] leading-relaxed">
                  Public lookups reveal only basic cadastral boundaries, survey identifiers, and registered tenure. Personal identifiers, encumbrance amounts, and fraud risk scores are strictly access-controlled.
                </p>
              </div>

              <div className="rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-[#101828]">
                  <KeyRound className="h-4 w-4 text-[#0F766E]" />
                  <span>2. Cryptographic Sell Keys</span>
                </div>
                <p className="text-[#475467] leading-relaxed">
                  Verified property owners issue single-use 24-hour authorization tokens to named buyers. The registry validates SHA-256 digests without storing plaintext credentials.
                </p>
              </div>

              <div className="rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-[#101828]">
                  <Database className="h-4 w-4 text-[#B54708]" />
                  <span>3. Cadastral Overlap Guardrails</span>
                </div>
                <p className="text-[#475467] leading-relaxed">
                  Separating Axis Theorem (SAT) boundary overlap algorithms detect illegal double-registration before records reach the registrar desk.
                </p>
              </div>

              <div className="rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-[#101828]">
                  <FileCheck className="h-4 w-4 text-[#0B3A67]" />
                  <span>4. Sub-Registrar Adjudication</span>
                </div>
                <p className="text-[#475467] leading-relaxed">
                  All conveyance petitions require multi-owner quorum consents. Administrative overrides are permanently flagged in the immutable audit feed.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end pt-3 border-t border-[#D0D5DD]">
              <button
                onClick={() => setIsHowItWorksOpen(false)}
                className="rounded-md bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA]"
              >
                Close Explainer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplorerPage;
