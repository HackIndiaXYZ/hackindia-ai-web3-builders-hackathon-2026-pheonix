"""
Tests for the pure-Python spatial overlap math (gis_check.py).

These matter more than they look: gis_check is the only thing standing between
a redrawn survey and a fraudulent land grab, and it's a from-scratch
Separating Axis Theorem implementation rather than a battle-tested library.
The touching-edge and containment cases are the ones most likely to be wrong.
"""

import pytest

from gis_check import overlap_area_estimate, polygons_overlap

# A 40x30 parcel at the origin — the same shape as UP-0001-CLEAN.
BASE = [[0, 0], [40, 0], [40, 30], [0, 30]]


def test_identical_polygons_overlap():
    assert polygons_overlap(BASE, BASE) is True


def test_clearly_separate_polygons_do_not_overlap():
    far_away = [[100, 100], [140, 100], [140, 130], [100, 130]]
    assert polygons_overlap(BASE, far_away) is False


def test_partial_overlap_is_detected():
    encroaching = [[30, 10], [70, 10], [70, 40], [30, 40]]
    assert polygons_overlap(BASE, encroaching) is True


def test_fully_contained_polygon_overlaps():
    """A small parcel entirely inside a larger one has no separating axis —
    the classic case a naive edge-intersection test would miss."""
    inner = [[10, 10], [20, 10], [20, 20], [10, 20]]
    assert polygons_overlap(BASE, inner) is True
    assert polygons_overlap(inner, BASE) is True


def test_adjacent_parcels_sharing_an_edge_do_not_overlap():
    """
    The real-world case that must NOT flag: two legitimately adjacent parcels
    sharing a boundary line. Treating this as encroachment would block every
    honest transfer of a parcel with neighbours.
    """
    neighbour = [[40, 0], [80, 0], [80, 30], [40, 30]]
    assert polygons_overlap(BASE, neighbour) is False


def test_seeded_parcels_do_not_overlap_each_other():
    """UP-0001 and UP-0002 from the seed data are adjacent with a 1-unit gap."""
    up_0002 = [[41, 0], [66, 0], [66, 34], [41, 34]]
    assert polygons_overlap(BASE, up_0002) is False


def test_seeded_boundary_creep_scenario_overlaps():
    """REQ-08's redrawn survey extends 10 units east into UP-0002."""
    claimed = [[0, 0], [50, 0], [50, 30], [0, 30]]
    up_0002 = [[41, 0], [66, 0], [66, 34], [41, 34]]
    assert polygons_overlap(claimed, up_0002) is True


def test_overlap_is_symmetric():
    a = [[0, 0], [10, 0], [10, 10], [0, 10]]
    b = [[5, 5], [15, 5], [15, 15], [5, 15]]
    assert polygons_overlap(a, b) == polygons_overlap(b, a)


def test_triangles_are_supported():
    """Cadastral parcels are not all rectangles."""
    triangle = [[0, 0], [10, 0], [5, 10]]
    overlapping = [[4, 1], [9, 1], [7, 6]]
    assert polygons_overlap(triangle, overlapping) is True
    assert polygons_overlap(triangle, [[50, 50], [60, 50], [55, 60]]) is False


# ------------------------------------------------------------ area estimate

def test_overlap_area_estimate_is_roughly_correct():
    """
    Monte Carlo, so this is deliberately a loose bound. The exact overlap of
    these two squares is 25 sq units; anything in the right ballpark is fine,
    since the figure is only used in a human-readable message.
    """
    a = [[0, 0], [10, 0], [10, 10], [0, 10]]
    b = [[5, 0], [15, 0], [15, 5], [5, 5]]
    est = overlap_area_estimate(a, b, samples=20000)
    assert 18 <= est <= 32


def test_overlap_area_estimate_of_identical_squares():
    square = [[0, 0], [10, 0], [10, 10], [0, 10]]
    est = overlap_area_estimate(square, square, samples=20000)
    assert 90 <= est <= 110


def test_non_overlapping_area_estimate_is_near_zero():
    a = [[0, 0], [10, 0], [10, 10], [0, 10]]
    b = [[50, 50], [60, 50], [60, 60], [50, 60]]
    assert overlap_area_estimate(a, b, samples=5000) < 1.0


def test_degenerate_input_returns_zero_area():
    """Guards the bbox_area == 0 branch rather than dividing by zero."""
    point = [[5, 5], [5, 5], [5, 5]]
    assert overlap_area_estimate(point, point, samples=100) == 0.0
