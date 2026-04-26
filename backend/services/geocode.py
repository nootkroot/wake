"""Tiny offline-friendly geohash + reverse-geocode helpers.

The reverse geocoder is intentionally lightweight: it returns a label like
"39.95, -75.16" for the hackathon. Swap in a real provider (Mapbox, OSM
Nominatim) by replacing reverse_geocode().
"""
from __future__ import annotations

from typing import Optional

_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def encode_geohash(lat: float, lng: float, precision: int = 9) -> str:
    lat_range = [-90.0, 90.0]
    lng_range = [-180.0, 180.0]
    bits = []
    is_lng = True
    while len(bits) < precision * 5:
        if is_lng:
            mid = (lng_range[0] + lng_range[1]) / 2
            if lng >= mid:
                bits.append(1)
                lng_range[0] = mid
            else:
                bits.append(0)
                lng_range[1] = mid
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat >= mid:
                bits.append(1)
                lat_range[0] = mid
            else:
                bits.append(0)
                lat_range[1] = mid
        is_lng = not is_lng

    out = []
    for i in range(0, len(bits), 5):
        chunk = bits[i : i + 5]
        idx = 0
        for b in chunk:
            idx = (idx << 1) | b
        out.append(_BASE32[idx])
    return "".join(out)


def reverse_geocode(lat: float, lng: float) -> Optional[str]:
    """Return a human-readable label for a coordinate. Stub implementation."""
    return f"{lat:.4f}, {lng:.4f}"
