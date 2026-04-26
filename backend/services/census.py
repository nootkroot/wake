"""US Census ACS 5-Year API client for tract-level demographic enrichment."""
from __future__ import annotations

import asyncio
from typing import Optional

import httpx

from ..config import get_settings
from ..models.submission import Submission
from ..schemas import DemographicEnrichedSubmission, SubmissionRead, TractDemographics

GEOCODER_BASE = "https://geocoding.geo.census.gov/geocoder"


class CensusError(RuntimeError):
    pass


class CensusService:
    """
    Queries the US Census ACS 5-Year API. No API key required.
    Caches tract lookups in an in-memory dict for the lifetime of the service.
    """

    def __init__(self, httpx_client: httpx.AsyncClient | None = None) -> None:
        self._settings = get_settings()
        self._client = httpx_client
        self._owns_client = httpx_client is None
        self._tract_cache: dict[tuple[float, float], Optional[str]] = {}
        self._demo_cache: dict[str, TractDemographics] = {}

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=20.0)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and self._owns_client:
            await self._client.aclose()
            self._client = None

    async def get_tract_fips(self, lat: float, lng: float) -> Optional[str]:
        key = (round(lat, 4), round(lng, 4))
        if key in self._tract_cache:
            return self._tract_cache[key]
        try:
            client = await self._get_client()
            resp = await client.get(
                f"{GEOCODER_BASE}/geographies/coordinates",
                params={
                    "x": lng,
                    "y": lat,
                    "benchmark": "Public_AR_Current",
                    "vintage": "Current_Current",
                    "layers": "Census Tracts",
                    "format": "json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            tracts = data.get("result", {}).get("geographies", {}).get("Census Tracts", [])
            if not tracts:
                self._tract_cache[key] = None
                return None
            t = tracts[0]
            fips = f"{t['STATE']}{t['COUNTY']}{t['TRACT']}"
            self._tract_cache[key] = fips
            return fips
        except Exception:
            self._tract_cache[key] = None
            return None

    async def get_tract_demographics(self, lat: float, lng: float) -> Optional[TractDemographics]:
        fips = await self.get_tract_fips(lat, lng)
        if fips is None:
            return None
        if fips in self._demo_cache:
            return self._demo_cache[fips]
        state, county, tract = fips[:2], fips[2:5], fips[5:]
        client = await self._get_client()
        # ACS 5-year. Variables:
        #   B19013_001E   Median household income
        #   B17001_001E   Total population for poverty universe
        #   B17001_002E   Income below poverty
        variables = "B19013_001E,B17001_001E,B17001_002E"
        try:
            resp = await client.get(
                f"{self._settings.census_api_base}/2022/acs/acs5",
                params={
                    "get": variables,
                    "for": f"tract:{tract}",
                    "in": f"state:{state} county:{county}",
                },
            )
            resp.raise_for_status()
            rows = resp.json()
        except Exception:
            return None
        if not rows or len(rows) < 2:
            return None
        header, values = rows[0], rows[1]
        zipped = dict(zip(header, values))

        median_income = _safe_int(zipped.get("B19013_001E"))
        poverty_total = _safe_int(zipped.get("B17001_001E"))
        poverty_below = _safe_int(zipped.get("B17001_002E"))
        poverty_rate: Optional[float] = None
        if poverty_total and poverty_total > 0 and poverty_below is not None:
            poverty_rate = round(poverty_below / poverty_total, 3)

        tier = _income_to_tier(median_income)

        demo = TractDemographics(
            tract_fips=fips,
            median_income=median_income,
            poverty_rate=poverty_rate,
            languages={},
            age_distribution={},
            estimated_socioeconomic_tier=tier,
        )
        self._demo_cache[fips] = demo
        return demo

    async def enrich_submissions(
        self, submissions: list[Submission]
    ) -> list[DemographicEnrichedSubmission]:
        results: list[DemographicEnrichedSubmission] = []
        # Deduplicate location lookups
        unique_pairs: dict[tuple[float, float], asyncio.Task] = {}
        for sub in submissions:
            if sub.latitude is None or sub.longitude is None:
                continue
            key = (round(sub.latitude, 4), round(sub.longitude, 4))
            if key not in unique_pairs:
                unique_pairs[key] = asyncio.create_task(
                    self.get_tract_demographics(sub.latitude, sub.longitude)
                )
        demo_by_key: dict[tuple[float, float], Optional[TractDemographics]] = {}
        for key, task in unique_pairs.items():
            demo_by_key[key] = await task

        for sub in submissions:
            demo: Optional[TractDemographics] = None
            if sub.latitude is not None and sub.longitude is not None:
                key = (round(sub.latitude, 4), round(sub.longitude, 4))
                demo = demo_by_key.get(key)
            results.append(
                DemographicEnrichedSubmission(
                    submission=SubmissionRead.model_validate(sub, from_attributes=True),
                    tract_fips=demo.tract_fips if demo else None,
                    median_income=demo.median_income if demo else None,
                    poverty_rate=demo.poverty_rate if demo else None,
                    languages=demo.languages if demo else {},
                    estimated_socioeconomic_tier=demo.estimated_socioeconomic_tier if demo else None,
                )
            )
        return results


def _safe_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        n = int(value)
    except (ValueError, TypeError):
        return None
    if n < 0:  # ACS uses negatives as nodata sentinels
        return None
    return n


def _income_to_tier(income: Optional[int]) -> int:
    if income is None:
        return 3
    if income < 30000:
        return 1
    if income < 55000:
        return 2
    if income < 90000:
        return 3
    if income < 140000:
        return 4
    return 5
