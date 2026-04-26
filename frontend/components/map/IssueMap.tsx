"use client";

import { useEffect, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchIssuesGeoJSON } from "@/lib/api";
import type { GeoJSONFeature } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "47.6062");
const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "-122.3321");

function severityColor(severity: number | null): string {
  switch (severity) {
    case 4:
      return "#ef4444";
    case 3:
      return "#fb923c";
    case 2:
      return "#fbbf24";
    case 1:
      return "#94a3b8";
    default:
      return "#a3a3a3";
  }
}

export function IssueMap() {
  const [features, setFeatures] = useState<GeoJSONFeature[]>([]);
  const [active, setActive] = useState<GeoJSONFeature | null>(null);

  useEffect(() => {
    fetchIssuesGeoJSON()
      .then((collection) => setFeatures(collection.features))
      .catch(() => setFeatures([]));
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the issue map.
        </p>
        <p className="mt-2 text-xs">
          {features.length} issue(s) currently fetched (showing as a list below).
        </p>
        <ul className="mt-4 space-y-2 text-left text-sm">
          {features.slice(0, 8).map((f) => (
            <li key={String(f.properties.id)} className="flex justify-between">
              <span>{String(f.properties.title)}</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs text-white"
                style={{
                  backgroundColor: severityColor(
                    (f.properties.severity as number | null) ?? null,
                  ),
                }}
              >
                sev {String(f.properties.severity ?? "?")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="h-[480px] rounded-lg overflow-hidden border border-border">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, zoom: 11 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        {features.map((f) => {
          const [lng, lat] = f.geometry.coordinates;
          const severity = (f.properties.severity as number | null) ?? null;
          const markerColor = severityColor(severity);
          return (
            <Marker key={String(f.properties.id)} longitude={lng} latitude={lat}>
              <button
                onClick={() => setActive(f)}
                className="h-4 w-4 rounded-full border-2 shadow"
                style={{
                  backgroundColor: markerColor,
                  borderColor: "#0f172a",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.2)",
                }}
                aria-label={String(f.properties.title)}
              />
            </Marker>
          );
        })}
        {active && (
          <Popup
            longitude={active.geometry.coordinates[0]}
            latitude={active.geometry.coordinates[1]}
            onClose={() => setActive(null)}
            closeOnClick={false}
            anchor="top"
            className="wake-map-popup"
          >
            <div
              className="text-sm"
              style={{ color: "#e2e8f0" }}
            >
              <div
                className="font-medium"
                style={{
                  color: severityColor((active.properties.severity as number | null) ?? null),
                }}
              >
                {String(active.properties.title)}
              </div>
              <div className="text-xs" style={{ color: "#94a3b8" }}>
                Severity: {String(active.properties.severity ?? "?")} ·
                Vote popularity: {String(active.properties.display_score ?? 0)}
              </div>
              <a
                className="text-xs"
                style={{ color: "#7dd3fc" }}
                href={`/issues/${String(active.properties.id)}`}
              >
                Open →
              </a>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
