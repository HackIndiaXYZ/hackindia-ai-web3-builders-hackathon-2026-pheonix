"""
Spatial overlap detection for convex polygons (rectangles are convex, which
covers the demo dataset — most real cadastral parcels are also reasonably
close to convex).

Implements the Separating Axis Theorem (SAT): two convex polygons do NOT
overlap if and only if there exists an axis (perpendicular to one of their
edges) onto which their projections don't overlap. Check every candidate
axis from both polygons; if none separates them, they overlap.

EXTENSION POINT: this is the pure-Python stand-in for PostGIS's ST_Overlaps
(see ADR-4 in the CTO architecture doc). Once you're running real PostgreSQL
with the PostGIS extension, replace calls to `polygons_overlap()` with an
`ST_Overlaps` query — same boolean result, but backed by a spatial index
instead of an O(n) Python loop, which matters once you have more than a
few hundred parcels.
"""

# Tolerance for treating two projections as merely touching rather than
# overlapping. Coordinates are metres, so 1e-9 is nine orders of magnitude
# below anything a survey could resolve.
EPSILON = 1e-9


def _edges(polygon):
    return [
        (polygon[i], polygon[(i + 1) % len(polygon)])
        for i in range(len(polygon))
    ]


def _project(polygon, axis):
    dots = [p[0] * axis[0] + p[1] * axis[1] for p in polygon]
    return min(dots), max(dots)


def _normalize(v):
    length = (v[0] ** 2 + v[1] ** 2) ** 0.5
    if length == 0:
        return (0, 0)
    return (v[0] / length, v[1] / length)


def polygons_overlap(poly_a: list, poly_b: list) -> bool:
    """
    poly_a, poly_b: list of [x, y] point pairs, in order around the polygon.
    Returns True if the two convex polygons overlap (including partial overlap).

    Polygons that merely *touch* — sharing an edge or a corner — do not count
    as overlapping. That distinction is the whole ballgame here: adjacent
    parcels sharing a boundary line are the normal case in a land registry, and
    treating contact as encroachment would flag every honest transfer of a
    parcel that has neighbours.
    """
    for polygon in (poly_a, poly_b):
        for (p1, p2) in _edges(polygon):
            edge = (p2[0] - p1[0], p2[1] - p1[1])
            axis = _normalize((-edge[1], edge[0]))  # perpendicular to the edge
            min_a, max_a = _project(poly_a, axis)
            min_b, max_b = _project(poly_b, axis)
            # <= rather than <, so exact contact separates. EPSILON absorbs
            # float error from _normalize on non-axis-aligned edges; it is far
            # below any real survey precision, so it cannot mask a true overlap.
            if max_a <= min_b + EPSILON or max_b <= min_a + EPSILON:
                return False  # found a separating axis -> no overlap
    return True


def overlap_area_estimate(poly_a: list, poly_b: list, samples: int = 2000) -> float:
    """
    Rough Monte Carlo estimate of overlap area, used only for the human-
    readable risk-report message (e.g. 'approximately 300 sqm of overlap') —
    not precision-critical, so this simple approach is fine for a hackathon.
    A production system would compute exact polygon intersection area
    (e.g. via Shapely or PostGIS ST_Area(ST_Intersection(...))).
    """
    xs = [p[0] for p in poly_a + poly_b]
    ys = [p[1] for p in poly_a + poly_b]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    bbox_area = (x_max - x_min) * (y_max - y_min)
    if bbox_area == 0:
        return 0.0

    def point_in_convex_polygon(pt, polygon):
        sign = None
        for (p1, p2) in _edges(polygon):
            edge = (p2[0] - p1[0], p2[1] - p1[1])
            to_pt = (pt[0] - p1[0], pt[1] - p1[1])
            cross = edge[0] * to_pt[1] - edge[1] * to_pt[0]
            if cross == 0:
                continue
            s = cross > 0
            if sign is None:
                sign = s
            elif sign != s:
                return False
        return True

    import random
    inside_both = 0
    for _ in range(samples):
        pt = (random.uniform(x_min, x_max), random.uniform(y_min, y_max))
        if point_in_convex_polygon(pt, poly_a) and point_in_convex_polygon(pt, poly_b):
            inside_both += 1

    return round(bbox_area * (inside_both / samples), 1)
