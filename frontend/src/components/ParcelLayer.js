import { PolygonLayer } from "@deck.gl/layers";

/**
 * Constructs the deck.gl PolygonLayer for 3D extruded land parcels.
 * Colors strictly derive from title_status ONLY (never risk_status).
 * Features transparent dark fills with thin bright outlines.
 */
export function createParcelLayer({
  parcels = [],
  selectedParcelId = null,
  hoveredParcelId = null,
  onHover = () => {},
  onClick = () => {},
}) {
  const getFillColor = (d) => {
    const isSelected = d.id === selectedParcelId;
    const isHovered = d.id === hoveredParcelId;

    if (isSelected) {
      return [0, 240, 255, 140]; // Selected electric highlight fill
    }

    const status = (d.title_status || "").toUpperCase();
    let baseRgba = [71, 84, 103, 110]; // neutral blue-gray

    if (status === "VERIFIED" || status === "SUCCESSION_COMPLETED" || status === "PARTITIONED") {
      baseRgba = [16, 185, 129, 110]; // emerald green
    } else if (
      status === "REVIEW" ||
      status === "REVIEW_REQUIRED" ||
      status === "VERIFIED_WITH_ENCUMBRANCE" ||
      status === "VERIFIED_WITH_HISTORY_GAP"
    ) {
      baseRgba = [245, 158, 11, 110]; // amber
    } else if (status === "DISPUTED" || status === "HIGH_RISK") {
      baseRgba = [239, 68, 68, 130]; // red
    } else if (status === "FROZEN") {
      baseRgba = [100, 116, 139, 110]; // gray
    } else if (status === "SUCCESSION_PENDING" || status === "CREDENTIAL_RECOVERY") {
      baseRgba = [59, 130, 246, 110]; // blue
    }

    if (isHovered) {
      return [baseRgba[0], baseRgba[1], baseRgba[2], 175];
    }
    return baseRgba;
  };

  const getLineColor = (d) => {
    const isSelected = d.id === selectedParcelId;
    const isHovered = d.id === hoveredParcelId;

    if (isSelected) {
      return [0, 240, 255, 255]; // Electric cyan outline
    }
    if (isHovered) {
      return [255, 255, 255, 255]; // Pure white highlight on hover
    }

    const status = (d.title_status || "").toUpperCase();
    if (status === "VERIFIED" || status === "SUCCESSION_COMPLETED" || status === "PARTITIONED") {
      return [52, 211, 153, 240]; // Bright green line
    }
    if (
      status === "REVIEW" ||
      status === "REVIEW_REQUIRED" ||
      status === "VERIFIED_WITH_ENCUMBRANCE" ||
      status === "VERIFIED_WITH_HISTORY_GAP"
    ) {
      return [251, 191, 36, 240]; // Bright amber line
    }
    if (status === "DISPUTED" || status === "HIGH_RISK") {
      return [248, 113, 113, 240]; // Bright red line
    }
    if (status === "FROZEN") {
      return [148, 163, 184, 240]; // Gray line
    }
    if (status === "SUCCESSION_PENDING" || status === "CREDENTIAL_RECOVERY") {
      return [96, 165, 250, 240]; // Bright blue line
    }

    return [148, 163, 184, 220];
  };

  const getElevation = (d) => {
    const area = d.area_sqm || 1000;
    const baseHeight = Math.max(14, Math.round((Math.log10(area) - 2.5) * 45 + 16));
    const clamped = Math.min(65, Math.max(15, baseHeight));
    return d.id === selectedParcelId ? clamped + 22 : clamped;
  };

  return new PolygonLayer({
    id: "parcels-3d-extruded",
    data: parcels,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: true,
    wireframe: true,
    lineWidthMinPixels: 1.5,
    getPolygon: (d) => d.boundary,
    getElevation,
    getFillColor,
    getLineColor,
    getLineWidth: (d) => {
      if (d.id === selectedParcelId) return 4;
      if (d.id === hoveredParcelId) return 2.5;
      return 1.5;
    },
    updateTriggers: {
      getElevation: [selectedParcelId],
      getFillColor: [selectedParcelId, hoveredParcelId],
      getLineColor: [selectedParcelId, hoveredParcelId],
      getLineWidth: [selectedParcelId, hoveredParcelId],
    },
    onHover,
    onClick: (info) => {
      if (info?.object) {
        onClick(info.object);
      }
    },
  });
}
