"use client";

import CityBackdrop from "@/components/landing/CityBackdrop";

type Position = "fixed" | "absolute";

/**
 * Shared city parallax + color atmosphere for the landing page and app routes.
 * Keeps the same stack as the marketing home (neon city + dark / purple grade).
 */
export function WakeSceneBackdrop({
  position = "absolute",
}: {
  position?: Position;
}) {
  const pos = position === "fixed" ? "fixed inset-0 z-0" : "absolute inset-0 z-0";

  return (
    <div className={`pointer-events-none ${pos} overflow-hidden`} aria-hidden>
      <CityBackdrop />
      {/* Match landing: deep black top → subtle purple / magenta in the lower field */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black via-zinc-950/25 to-fuchsia-950/40" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black via-transparent to-black/55" />
      <div className="absolute inset-0 z-[3] bg-[radial-gradient(100%_70%_at_50%_100%,rgba(109,40,217,0.22),transparent_60%)]" />
    </div>
  );
}
