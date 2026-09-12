import React from "react";
import { Mountain, Globe2, RotateCcw, Compass, Plus, Minus } from "lucide-react";

/**
 * Bottom-right floating map controls
 * Includes: 3D terrain toggle, satellite/base toggle, reset view, pitch toggle, zoom in/out
 */
export function MapControls({
  isSatellite,
  onToggleSatellite,
  isTerrainEnabled,
  onToggleTerrain,
  onResetView,
  onTogglePitch,
  isPitchActive,
  onZoomIn,
  onZoomOut,
}) {
  return (
    <div className="map-controls fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 flex flex-col items-end gap-2.5">
      {/* Primary Toggles Pill Group */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-navy-900/85 p-1.5 shadow-glass backdrop-blur-xl">
        {/* Satellite vs Vector Toggle */}
        <button
          type="button"
          onClick={onToggleSatellite}
          title={isSatellite ? "Switch to Vector Base (Liberty)" : "Switch to High-Res Satellite"}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
            isSatellite
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow-sm"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Globe2 className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="hidden sm:inline">{isSatellite ? "Satellite" : "Base Map"}</span>
        </button>

        {/* 3D Terrain Elevation Toggle */}
        <button
          type="button"
          onClick={onToggleTerrain}
          title={isTerrainEnabled ? "Disable 3D Terrain Elevation" : "Enable 3D AWS Terrarium Terrain"}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
            isTerrainEnabled
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow-sm"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Mountain className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="hidden sm:inline">3D Terrain</span>
        </button>

        {/* 2D / 3D Pitch Toggle */}
        <button
          type="button"
          onClick={onTogglePitch}
          title={isPitchActive ? "Switch to Flat 2D View" : "Tilt to 3D Oblique View (55°)"}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
            isPitchActive
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Compass className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="hidden sm:inline">{isPitchActive ? "3D Tilt" : "2D Top"}</span>
        </button>

        {/* Reset Camera View */}
        <button
          type="button"
          onClick={onResetView}
          title="Reset View to Initial Center"
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-cyan-300 transition-all duration-200"
        >
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Zoom In / Zoom Out vertical button stack */}
      <div className="flex flex-col rounded-xl border border-white/10 bg-navy-900/85 p-1 shadow-glass backdrop-blur-xl">
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="h-px w-full bg-white/10" />
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
