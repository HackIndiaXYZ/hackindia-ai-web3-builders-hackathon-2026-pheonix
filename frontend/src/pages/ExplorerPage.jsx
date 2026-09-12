import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { parcelService } from "../services/liveData.js";

import { MapExplorer } from "../components/MapExplorer.jsx";
import { SearchBar } from "../components/SearchBar.jsx";
import { LeftSidebar } from "../components/LeftSidebar.jsx";
import { MapControls } from "../components/MapControls.jsx";
import { MapLegend } from "../components/MapLegend.jsx";
import { ParcelDrawer } from "../components/ParcelDrawer.jsx";
import { TopBarAuth } from "../components/TopBarAuth.jsx";
import { DashboardModal } from "../components/DashboardModal.jsx";
import { AccountModal } from "../components/AccountModal.jsx";
import { Menu } from "lucide-react";
import { getStatusCategory } from "../lib/parcelColors.js";
import { useAuth } from "../context/AuthContext.jsx";

export function ExplorerPage() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [error, setError] = useState("");
  const meta = { map_center: { lat: 28.4744, lng: 77.5040, zoom: 14 } };
  const mapLayers = { demo_viewport: [] };

  const [searchParams] = useSearchParams();
  const targetUlpin = searchParams.get("ulpin");

  const [selectedParcel, setSelectedParcel] = useState(null);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(true);
  const [isPitchActive, setIsPitchActive] = useState(true);
  const [activeView, setActiveView] = useState("map"); // 'map' | 'dashboard' | 'account'
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    parcelService.list(token).then(setParcels).catch((err) => setError(err.message));
  }, [token]);

  const mapRef = useRef(null);

  // Deep linking: If URL has ?ulpin=..., select and focus that parcel automatically
  useEffect(() => {
    if (targetUlpin && parcels.length > 0) {
      const match = parcels.find(
        (p) => p.ulpin?.toLowerCase() === targetUlpin.toLowerCase()
      );
      if (match) {
        setSelectedParcel(match);
        setScrollSignal((prev) => prev + 1);
        setActiveView("map");
      }
    }
  }, [targetUlpin, parcels]);

  // Filter parcels if user clicked a status filter in the legend
  const displayedParcels = React.useMemo(() => {
    if (!activeStatusFilter) return parcels;
    return parcels.filter((p) => getStatusCategory(p) === activeStatusFilter);
  }, [parcels, activeStatusFilter]);

  // Parcel selection handler
  const handleSelectParcel = useCallback((parcel) => {
    setSelectedParcel(parcel);
    setScrollSignal((prev) => prev + 1);
  }, []);

  // Quick select by ULPIN
  const handleSelectByUlpin = useCallback(
    (ulpin) => {
      const found = parcels.find((p) => p.ulpin === ulpin);
      if (found) {
        handleSelectParcel(found);
        setActiveView("map");
      }
    },
    [parcels, handleSelectParcel]
  );

  // Reset view to initial camera
  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [meta.map_center?.lng || 77.5040, meta.map_center?.lat || 28.4744],
        zoom: meta.map_center?.zoom || 14,
        pitch: 48,
        bearing: 0,
        duration: 350,
        essential: true,
      });
    }
  }, [meta.map_center]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomIn({ duration: 250 });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) mapRef.current.zoomOut({ duration: 250 });
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-navy-950 font-sans select-none text-slate-100">
      {error && <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded bg-rose-950 px-3 py-2 text-xs text-rose-200">{error}</div>}
      {/* 1. Full-Bleed 3D Map (Center & Background) */}
      <MapExplorer
        parcels={displayedParcels}
        selectedParcel={selectedParcel}
        onSelectParcel={handleSelectParcel}
        isSatellite={isSatellite}
        isTerrainEnabled={isTerrainEnabled}
        isPitchActive={isPitchActive}
        mapRefOut={mapRef}
      />

      {/* Mobile Sidebar Hamburger Button */}
      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed top-5 left-5 z-30 lg:hidden flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-navy-900/85 p-2 shadow-glass backdrop-blur-xl text-slate-200"
        aria-label="Open Navigation Menu"
      >
        <Menu className="h-5 w-5 text-cyan-400" />
      </button>

      {/* 2. Fixed Rounded Glass Left Sidebar (~260px) */}
      <LeftSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        demoViewport={mapLayers.demo_viewport || []}
        parcels={parcels}
        onSelectParcelByUlpin={handleSelectByUlpin}
        selectedParcelUlpin={selectedParcel?.ulpin}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 3. Floating Pill Search Bar (Top-Center) */}
      <SearchBar
        parcels={parcels}
        onSelectParcel={handleSelectParcel}
        selectedParcelId={selectedParcel?.id}
      />

      {/* 4. Top-Right: Authentication Pill Buttons / User Profile */}
      <TopBarAuth />

      {/* 5. Status Semantics Color Legend (Bottom-Left) */}
      <MapLegend
        activeFilter={activeStatusFilter}
        onSelectFilter={setActiveStatusFilter}
      />

      {/* 6. Bottom-Right Floating Controls (3D terrain, satellite toggle, reset view, pitch, zoom) */}
      <MapControls
        isSatellite={isSatellite}
        onToggleSatellite={() => setIsSatellite(!isSatellite)}
        isTerrainEnabled={isTerrainEnabled}
        onToggleTerrain={() => setIsTerrainEnabled(!isTerrainEnabled)}
        onResetView={handleResetView}
        onTogglePitch={() => setIsPitchActive(!isPitchActive)}
        isPitchActive={isPitchActive}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* 7. Google-Maps-Style Right Drawer (Slides in when parcel selected) */}
      {selectedParcel && (
        <ParcelDrawer
          parcel={selectedParcel}
          onClose={() => setSelectedParcel(null)}
          scrollSignal={scrollSignal}
        />
      )}

      {/* Auxiliary Overlays: Dashboard Modal */}
      {activeView === "dashboard" && (
        <DashboardModal
          parcels={parcels}
          onClose={() => setActiveView("map")}
          onSelectParcel={handleSelectParcel}
        />
      )}

      {/* Auxiliary Overlays: Simulated Read-Only Account Modal */}
      {activeView === "account" && (
        <AccountModal
          users={users}
          onClose={() => setActiveView("map")}
        />
      )}
    </div>
  );
}
