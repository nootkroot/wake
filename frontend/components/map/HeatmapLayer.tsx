"use client";

import { useEffect, useState } from "react";
import Map, { Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchDashboardMap } from "@/lib/api";
import type { GeoJSONCollection } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "47.6062");
const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "-122.3321");

export function HeatmapLayer({ periodId }: { periodId?: string }) {
  const [data, setData] = useState<GeoJSONCollection | null>(null);

  useEffect(() => {
    fetchDashboardMap(periodId ? { period_id: periodId } : {})
      .then(setData)
      .catch(() => setData({ type: "FeatureCollection", features: [] }));
  }, [periodId]);

  if (!MAPBOX_TOKEN || !data) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the heatmap.
        </p>
        <p className="mt-2 text-xs">{data?.features.length ?? 0} issue(s) loaded.</p>
      </div>
    );
  }

  return (
    <div className="h-[480px] rounded-lg overflow-hidden border border-border">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, zoom: 11 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
      >
        <Source id="issues" type="geojson" data={data}>
          <Layer
            id="issues-heat"
            type="heatmap"
            paint={{
              "heatmap-weight": ["coalesce", ["get", "weight"], 1],
              "heatmap-intensity": 1.5,
              "heatmap-radius": 30,
              "heatmap-opacity": 0.8,
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
