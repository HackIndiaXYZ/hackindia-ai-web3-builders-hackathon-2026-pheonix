import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PolygonLayer, TextLayer } from "@deck.gl/layers";
import { Mountain, Layers, RotateCcw, Plus, Minus, Compass } from "lucide-react";

export const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const TERRAIN_TILE_URL =
  "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";

export const INITIAL_CAMERA = {
  center: [77.5040, 28.4744],
  zoom: 14,
  pitch: 55,
  bearing: -15,
};

/** Hide only pre-existing extrusion layers; 2D building footprints remain available. */
export function disableNativeBuildingExtrusions(map) {
  if (!map) return;
  const style = map.getStyle();
  (style?.layers || []).forEach((layer) => {
    if (layer.type === "fill-extrusion" && layer.id !== "titlelock-building-extrusions") {
      try {
        map.setLayoutProperty(layer.id, "visibility", "none");
      } catch (error) {
        console.warn("Unable to hide style layer:", layer.id, error);
      }
    }
  });
}

/**
 * Turns the Liberty style's native OSM building footprints into visible 3D
 * buildings.  The source is discovered from the loaded style rather than
 * hard-coded, so it remains compatible with style updates.
 */
export function syncBuildingExtrusions(map, is3DView) {
  if (!map) return;
  const layerId = "titlelock-building-extrusions";
  const nativeExtrusion = (map.getStyle()?.layers || []).find(
    (layer) =>
      layer.type === "fill-extrusion" &&
      layer.id !== layerId &&
      /building/i.test(`${layer.id} ${layer["source-layer"] || ""}`)
  );
  if (nativeExtrusion) {
    map.setLayoutProperty(nativeExtrusion.id, "visibility", is3DView ? "visible" : "none");
    return;
  }
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", is3DView ? "visible" : "none");
    return;
  }

  const buildingFootprint = (map.getStyle()?.layers || []).find(
    (layer) =>
      layer.type === "fill" &&
      layer.source &&
      layer["source-layer"] &&
      /building/i.test(`${layer.id} ${layer["source-layer"]}`)
  );
  if (!buildingFootprint) return;

  map.addLayer({
    id: layerId,
    type: "fill-extrusion",
    source: buildingFootprint.source,
    "source-layer": buildingFootprint["source-layer"],
    minzoom: buildingFootprint.minzoom ?? 14,
    layout: { visibility: is3DView ? "visible" : "none" },
    paint: {
      "fill-extrusion-color": "#b7c4d4",
      "fill-extrusion-height": [
        "coalesce",
        ["to-number", ["get", "render_height"]],
        ["to-number", ["get", "height"]],
        8,
      ],
      "fill-extrusion-base": ["coalesce", ["to-number", ["get", "render_min_height"]], 0],
      "fill-extrusion-opacity": 0.9,
    },
  }, getParcelBeforeId(map));
}

/**
 * Frames all fixture parcels on initial load or view reset.
 */
export function fitAllParcels(map, parcels, is3DView = true) {
  if (!map) return;
  const bounds = new maplibregl.LngLatBounds();
  (parcels || []).forEach((p) =>
    (p.boundary || []).forEach(([lng, lat]) => bounds.extend([lng, lat]))
  );
  if (bounds.isEmpty()) {
    map.jumpTo({ center: [77.504, 28.4744], zoom: 14, pitch: is3DView ? 55 : 0, bearing: is3DView ? -15 : 0 });
    return;
  }
  map.fitBounds(bounds, {
    padding: { top: 130, right: 80, bottom: 100, left: 80 },
    maxZoom: 16,
    pitch: is3DView ? 55 : 0,
    bearing: is3DView ? -15 : 0,
    duration: 0,
  });
}

/**
 * Finds the first symbol layer in the style so deck.gl overlays before labels.
 */
export function getParcelBeforeId(map) {
  if (!map) return undefined;
  const style = map.getStyle();
  return style?.layers?.find((layer) => layer.type === "symbol")?.id;
}

/**
 * Pure Map Component rendered inside <div ref={mapHostRef} className="map-host">
 */
export function Map({
  mapHostRef,
  parcels = [],
  selectedParcel = null,
  onSelectParcel = () => {},
  onParcelHover = () => {},
  isSatellite = false,
  isTerrainEnabled = true,
  is3DView = true,
  onMapReady = () => {},
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // 1. Initialize MapLibre GL instance (strictly once)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BASE_STYLE_URL,
      center: INITIAL_CAMERA.center,
      zoom: INITIAL_CAMERA.zoom,
      pitch: INITIAL_CAMERA.pitch,
      bearing: INITIAL_CAMERA.bearing,
      maxPitch: 65,
      minZoom: 10,
      maxZoom: 19,
      attributionControl: false, // We render the floating AttributionChip component
    });

    mapInstanceRef.current = map;

    const handleMapLoad = (event) => {
      const loadedMap = event.target;

      // Ensure the map owns building extrusion rendering.
      disableNativeBuildingExtrusions(loadedMap);
      syncBuildingExtrusions(loadedMap, is3DView);

      // Frame all fixture parcels
      fitAllParcels(loadedMap, parcels);

      // Add Satellite Raster Source & Layer (inserted before symbols)
      if (!loadedMap.getSource("satellite-source")) {
        loadedMap.addSource("satellite-source", {
          type: "raster",
          tiles: [SATELLITE_TILE_URL],
          tileSize: 256,
          maxzoom: 19,
        });

        const beforeId = getParcelBeforeId(loadedMap);
        loadedMap.addLayer(
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite-source",
            layout: {
              visibility: isSatellite ? "visible" : "none",
            },
            paint: {
              "raster-opacity": 0.9,
            },
          },
          beforeId
        );
      }

      // Add the DEM source for future terrain analysis. It is deliberately not
      // applied to the camera: terrain elevation changes the visual ground
      // position beneath the camera and makes a 2D/3D switch look like a pan.
      if (!loadedMap.getSource("terrarium-dem")) {
        loadedMap.addSource("terrarium-dem", {
          type: "raster-dem",
          tiles: [TERRAIN_TILE_URL],
          tileSize: 256,
          maxzoom: 15,
          encoding: "terrarium",
        });

      }

      // Atmospheric fog
      try {
        if (loadedMap.setFog) {
          loadedMap.setFog({
            range: [-0.5, 4],
            color: "#05070c",
            "high-color": "#090d16",
            "space-color": "#05070c",
            "horizon-blend": 0.08,
          });
        }
      } catch {}

      // Immediate resize on load
      loadedMap.resize();
      setMapReady(true);
      onMapReady(loadedMap);
    };

    map.on("load", handleMapLoad);

    return () => {
      if (overlayRef.current) {
        try {
          map.removeControl(overlayRef.current);
        } catch {}
        overlayRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
      onMapReady(null);
    };
  }, []);

  // 2. ResizeObserver + map.resize() on host container
  useLayoutEffect(() => {
    const map = mapInstanceRef.current;
    const host = mapHostRef?.current;
    if (!map || !host) return;

    let frameId;
    const resizeMap = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        map.resize();
        requestAnimationFrame(() => map.resize());
      });
    };

    const observer = new ResizeObserver(resizeMap);
    observer.observe(host);
    window.addEventListener("resize", resizeMap);
    resizeMap();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", resizeMap);
    };
  }, [mapReady, mapHostRef]);

  // 3. Attach MapboxOverlay with interleaved: true (strictly once)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || overlayRef.current) return;

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);
    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current === overlay) {
        try {
          map.removeControl(overlay);
        } catch {}
        overlayRef.current = null;
      }
    };
  }, [mapReady]);

  // 4. Build parcelLayers with useMemo
  const parcelLayers = useMemo(() => {
    const visibleParcels = parcels.filter((parcel) =>
      Array.isArray(parcel.boundary) &&
      parcel.boundary.length >= 3 &&
      parcel.boundary.every((point) =>
        Array.isArray(point) && point.length >= 2 &&
        Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))
      )
    );
    const selectedId = selectedParcel?.ulpin || selectedParcel?.id;
    const beforeId = getParcelBeforeId(mapInstanceRef.current);
    const parcelCenter = (parcel) => {
      if (parcel.centroid) return [parcel.centroid.lng, parcel.centroid.lat, 42];
      const points = parcel.boundary || [];
      if (!points.length) return [0, 0, 0];
      const [lng, lat] = points.reduce(
        ([totalLng, totalLat], [pointLng, pointLat]) => [totalLng + pointLng, totalLat + pointLat],
        [0, 0]
      );
      return [lng / points.length, lat / points.length, 42];
    };

    return [
      new PolygonLayer({
        id: "titlelock-parcels",
        beforeId,
        data: visibleParcels,
        getPolygon: (p) => p.boundary,
        extruded: is3DView,
        wireframe: true,
        getElevation: (p) =>
          Math.max(8, Math.min(55, Math.sqrt(Number(p.area_sqm || 100)) * 0.45)),
        getFillColor: (p) => {
          if (p.ulpin === selectedId) return [35, 145, 255, 220];
          switch (p.title_status) {
            case "VERIFIED":
              return [16, 185, 129, 190];
            case "REVIEW":
              return [245, 158, 11, 205];
            case "DISPUTED":
            case "HIGH_RISK":
              return [239, 68, 68, 215];
            case "FROZEN":
              return [148, 163, 184, 200];
            case "SUCCESSION_PENDING":
            case "CREDENTIAL_RECOVERY":
              return [59, 130, 246, 205];
            default:
              return [100, 116, 139, 185];
          }
        },
        getLineColor: (p) =>
          p.ulpin === selectedId ? [100, 220, 255, 255] : [255, 255, 255, 245],
        getLineWidth: (p) => (p.ulpin === selectedId ? 5 : 3),
        lineWidthMinPixels: 2,
        pickable: true,
        autoHighlight: true,
        updateTriggers: {
          getFillColor: [selectedId],
          getLineColor: [selectedId],
          getLineWidth: [selectedId],
          getElevation: [selectedId],
        },
        onHover: ({ object, x, y }) => {
          onParcelHover(object ? { object, x, y } : null);
        },
        onClick: ({ object }) => {
          if (object) onSelectParcel(object);
        },
      }),
      new TextLayer({
        id: "titlelock-ulpin-labels",
        beforeId,
        data: visibleParcels,
        getPosition: parcelCenter,
        getText: (p) => p.ulpin,
        getSize: 11,
        getColor: [235, 245, 255, 230],
        billboard: true,
        pickable: false,
      }),
    ];
  }, [parcels, selectedParcel?.id, selectedParcel?.ulpin, is3DView, mapReady, onSelectParcel, onParcelHover]);

  // 5. Update deck.gl overlay props
  useEffect(() => {
    if (!overlayRef.current) return;
    overlayRef.current.setProps({ layers: parcelLayers });
  }, [parcelLayers]);

  // 6. Satellite visibility sync
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer("satellite-layer")) {
      map.setLayoutProperty(
        "satellite-layer",
        "visibility",
        isSatellite ? "visible" : "none"
      );
    }
  }, [isSatellite, mapReady]);

  // 7. Change only the camera pitch. Buildings remain fully extruded in 3D,
  // but elevation terrain is not applied because it shifts the visible ground
  // after the transition and feels like an unwanted map pan.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    const camera = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
    };
    // Explicitly clear terrain in case an earlier map session enabled it.
    try { map.setTerrain(null); } catch {}
    map.easeTo({
      ...camera,
      pitch: is3DView ? 55 : 0,
      duration: 350,
    });
  }, [isTerrainEnabled, is3DView, mapReady]);

  // Render OpenStreetMap building footprints as extrusions in 3D mode.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    syncBuildingExtrusions(map, is3DView);
  }, [is3DView, mapReady]);

  // 8. Smooth flyTo when selected parcel changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!selectedParcel || !map || !mapReady) return;

    if (selectedParcel.centroid) {
      map.flyTo({
        center: [selectedParcel.centroid.lng, selectedParcel.centroid.lat],
        zoom: 17,
        pitch: 55,
        bearing: -15,
        duration: 800,
      });
    }
  }, [selectedParcel, mapReady]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
}

/**
 * Floating Map Controls positioned at bottom-right inside .public-shell
 */
export function MapControls({
  isTerrainEnabled,
  onToggleTerrain,
  isSatellite,
  onToggleSatellite,
  onResetView,
  onResetBearing,
  onZoomIn,
  onZoomOut,
}) {
  return (
    <div
      className="map-controls flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#090d16]/90 p-1.5 shadow-2xl backdrop-blur-md select-none"
      aria-label="Map Controls"
    >
      {/* 3D Terrain */}
      <button
        onClick={onToggleTerrain}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          isTerrainEnabled
            ? "bg-[#0B3A67] text-white"
            : "text-slate-400 hover:bg-white/10 hover:text-white"
        }`}
        title={isTerrainEnabled ? "Switch to flat 2D view" : "Switch to 3D terrain view"}
        aria-label={isTerrainEnabled ? "Switch to flat 2D view" : "Switch to 3D terrain view"}
      >
        <Mountain className="h-4 w-4" />
      </button>

      {/* Satellite / standard map */}
      <button
        onClick={onToggleSatellite}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          isSatellite
            ? "bg-[#0B3A67] text-white"
            : "text-slate-400 hover:bg-white/10 hover:text-white"
        }`}
        title={isSatellite ? "Switch to standard map" : "Switch to satellite view"}
        aria-label={isSatellite ? "Switch to standard map" : "Switch to satellite view"}
      >
        <Layers className="h-4 w-4" />
      </button>

      {/* Reset View */}
      <button
        onClick={onResetView}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Reset Camera to Frame All Parcels"
        aria-label="Reset View"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Compass / Reset Bearing */}
      <button
        onClick={onResetBearing}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Reset North Orientation"
        aria-label="Reset Bearing"
      >
        <Compass className="h-4 w-4" />
      </button>

      <div className="my-0.5 h-px bg-white/10" />

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <Plus className="h-4 w-4" />
      </button>

      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
  );
}

// Backward compatibility export
export const MapExplorer = Map;
