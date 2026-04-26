"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Map, { Marker } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { createSubmission, ApiError } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import type { DisplayMode, Submission } from "@/lib/types";
import { browserClient } from "@/lib/supabase";

interface Props {
  defaultMode?: DisplayMode;
  onSubmitted?: (submission: Submission) => void;
}

export function SubmissionForm({ defaultMode = "SUGGESTION", onSubmitted }: Props) {
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? "47.6062");
  const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? "-122.3321");
  const [mode, setMode] = useState<DisplayMode>(defaultMode);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [lat, setLat] = useState<string>(DEFAULT_LAT.toFixed(6));
  const [lng, setLng] = useState<string>(DEFAULT_LNG.toFixed(6));
  const [locationLabel, setLocationLabel] = useState<string>("Resolving location...");
  const [mapView, setMapView] = useState({
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    zoom: 12,
  });
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [geoPermission, setGeoPermission] = useState<"granted" | "prompt" | "denied" | "unknown">(
    "unknown",
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        setGeoPermission(status.state);
        status.onchange = () => setGeoPermission(status.state);
      })
      .catch(() => {
        setGeoPermission("unknown");
      });
  }, []);

  async function detectLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocation(pos.coords.latitude, pos.coords.longitude, 14);
      },
      (geoError) => {
        if (geoError.code === 1) {
          setError("Location permission denied. Allow location access in your browser.");
        } else if (geoError.code === 2) {
          setError("Location unavailable. Try again or place the pin manually.");
        } else {
          setError("Location request timed out. Try again or place the pin manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function resolveLocationLabel(nextLat: number, nextLng: number) {
    const coordsFallback = `${nextLat.toFixed(4)}, ${nextLng.toFixed(4)}`;
    if (!MAPBOX_TOKEN) {
      setLocationLabel(coordsFallback);
      return;
    }
    setLocationLabel("Resolving location...");
    try {
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${nextLng},${nextLat}.json?types=address,neighborhood,place,locality&limit=1&access_token=${MAPBOX_TOKEN}`,
      );
      if (!resp.ok) {
        setLocationLabel(coordsFallback);
        return;
      }
      const data = (await resp.json()) as {
        features?: Array<{ place_name?: string }>;
      };
      const placeName = data.features?.[0]?.place_name?.trim();
      setLocationLabel(placeName && placeName.length > 0 ? placeName : coordsFallback);
    } catch {
      setLocationLabel(coordsFallback);
    }
  }

  useEffect(() => {
    if (mode !== "ISSUE") return;
    const currentLat = Number(lat);
    const currentLng = Number(lng);
    if (!Number.isFinite(currentLat) || !Number.isFinite(currentLng)) return;
    void resolveLocationLabel(currentLat, currentLng);
    // Run on mode switch so the default ISSUE pin always gets an address.
  }, [mode]);

  function updateLocation(nextLat: number, nextLng: number, nextZoom?: number) {
    setLat(nextLat.toFixed(6));
    setLng(nextLng.toFixed(6));
    setMapView((prev) => ({
      latitude: nextLat,
      longitude: nextLng,
      zoom: nextZoom ?? prev.zoom,
    }));
    void resolveLocationLabel(nextLat, nextLng);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = browserClient();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        setError("Please log in with Supabase before submitting.");
        return;
      }
      setUserEmail(user.email ?? "Signed in");
      const created = await createSubmission(
        {
          display_mode: mode,
          title: title.trim(),
          body: body.trim(),
          is_anonymous: anonymous,
          tags: tagsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
          lang: typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en",
        },
        user.id,
        getOrCreateSessionId(),
      );
      setTitle("");
      setBody("");
      setTagsRaw("");
      onSubmitted?.(created);
    } catch (e) {
      if (e instanceof ApiError) {
        if (
          typeof e.detail === "object" &&
          e.detail !== null &&
          "detail" in e.detail &&
          typeof (e.detail as { detail?: unknown }).detail === "string"
        ) {
          setError((e.detail as { detail: string }).detail);
        } else {
          setError(`Couldn't submit (${e.status})`);
        }
      } else {
        setError("Couldn't submit — please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit a {mode === "ISSUE" ? "geo-located issue" : "suggestion"}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Verified accounts may submit · anyone may vote anonymously.
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            {(["SUGGESTION", "ISSUE"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={
                  "rounded-md border px-3 py-1 text-sm " +
                  (mode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border")
                }
              >
                {m === "ISSUE" ? "Issue (mapped)" : "Suggestion (forum)"}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Submissions require a logged-in Supabase user.{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className="text-primary hover:underline">
              sign up
            </Link>
            .
          </p>
          {userEmail && <p className="text-xs text-muted-foreground">Submitting as {userEmail}</p>}

          <Input
            placeholder="Title (max 120 chars)"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder="Describe the issue or suggestion (max 2000 chars)"
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <Input
            placeholder="Tags, comma-separated"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
          />

          {mode === "ISSUE" && (
            <div className="space-y-2">
              {MAPBOX_TOKEN ? (
                <div className="h-[320px] overflow-hidden rounded-md border border-border">
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    {...mapView}
                    onMove={(evt) => setMapView(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    onClick={(evt) => updateLocation(evt.lngLat.lat, evt.lngLat.lng)}
                  >
                    <Marker
                      latitude={Number(lat) || DEFAULT_LAT}
                      longitude={Number(lng) || DEFAULT_LNG}
                      draggable
                      onDragEnd={(evt) => updateLocation(evt.lngLat.lat, evt.lngLat.lng)}
                    />
                  </Map>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Map unavailable. Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to use pin selection.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Pin location: {locationLabel}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={detectLocation}>
                Use my current location
              </Button>
              {geoPermission !== "granted" && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
                  <p className="font-medium">Location access needed for auto-pin</p>
                  {geoPermission === "denied" ? (
                    <p className="mt-1">
                      Location is currently blocked for this site, so browsers will not show a
                      permission popup again.
                    </p>
                  ) : (
                    <p className="mt-1">
                      Click <span className="font-medium">Use my current location</span> to trigger the
                      browser permission prompt.
                    </p>
                  )}
                  <ol className="mt-2 list-decimal pl-4 space-y-1">
                    <li>Click the lock/site icon next to the URL bar.</li>
                    <li>Set Location to Allow for <code>localhost:3000</code>.</li>
                    <li>Refresh and click Use my current location again.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Submit anonymously (suggestions only)
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
