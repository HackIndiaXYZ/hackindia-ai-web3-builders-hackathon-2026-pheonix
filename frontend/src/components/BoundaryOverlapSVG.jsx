/**
 * Draws the actual detected overlap, from the geometry the fraud engine
 * returns on a BOUNDARY_OVERLAP flag.
 *
 * This component used to be a fixed illustration with hardcoded coordinates —
 * it drew the same picture no matter which parcels actually overlapped, which
 * undercut the claim that nothing in the UI is faked. It now projects the real
 * polygons into the viewBox.
 */

const PAD = 6;
const W = 100;
const H = 60;

function makeProjection(polygons) {
  // Fit every polygon into the viewBox, preserving aspect ratio so parcel
  // shapes aren't distorted, and flipping Y because SVG's origin is top-left
  // while survey coordinates run bottom-up.
  const points = polygons.flat();
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);

  // Centre the drawing in the leftover space.
  const offsetX = PAD + (W - PAD * 2 - spanX * scale) / 2;
  const offsetY = PAD + (H - PAD * 2 - spanY * scale) / 2;

  return (poly) =>
    poly
      .map(([x, y]) => {
        const px = offsetX + (x - minX) * scale;
        const py = offsetY + (maxY - y) * scale;
        return `${px.toFixed(2)},${py.toFixed(2)}`;
      })
      .join(" ");
}

export function BoundaryOverlapSVG({ geometry }) {
  // No geometry means an older backend response; render nothing rather than a
  // misleading stock diagram.
  if (!geometry?.claimed?.length || !geometry?.neighbor?.length) return null;

  const project = makeProjection([geometry.claimed, geometry.neighbor]);
  const claimed = project(geometry.claimed);
  const neighbor = project(geometry.neighbor);

  return (
    <div className="mt-4 rounded-lg border border-risk-high/20 bg-black/40 p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
           aria-label="Diagram of the detected boundary overlap">
        <defs>
          {/* Hatching reads as "disputed area" without relying on colour
              alone, which matters for colour-blind viewers and projectors. */}
          <pattern id="overlap-hatch" width="3" height="3"
                   patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="3" stroke="#FF4D4D" strokeWidth="1.1" />
          </pattern>
          <clipPath id="clip-neighbor">
            <polygon points={neighbor} />
          </clipPath>
        </defs>

        {/* The intersection: the claimed polygon clipped to the neighbour's. */}
        <g clipPath="url(#clip-neighbor)">
          <polygon points={claimed} fill="url(#overlap-hatch)" />
        </g>

        <polygon points={neighbor} fill="#FFB020" fillOpacity="0.07"
                 stroke="#FFB020" strokeWidth="0.7" />
        <polygon points={claimed} fill="none" stroke="#3DDC97"
                 strokeWidth="0.9" strokeDasharray="2.5 1.5" />
      </svg>

      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-risk-approved" />
          Claimed boundary on this submission
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="inline-block h-0 w-4 border-t-2 border-risk-flagged" />
          Registered boundary of{" "}
          <span className="font-mono text-risk-flagged">{geometry.neighbor_ulpin}</span>
          {geometry.neighbor_owner && ` · ${geometry.neighbor_owner}`}
        </div>
        <div className="pt-1 text-risk-high">
          Hatched region is the disputed overlap —{" "}
          <span className="font-mono">~{geometry.overlap_area_sqm} sqm</span> encroaching
          on land that already has a registered title.
        </div>
      </div>
    </div>
  );
}
