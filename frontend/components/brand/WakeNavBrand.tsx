"use client";

import Link from "next/link";
import { FIGMA_ASSETS } from "@/lib/figma-assets";

/**
 * Horizontal lockup for in-app header: same assets as {@link HeroPanel}
 * (`roundSun` + `/assets/WAKE.svg`), sun left of wordmark.
 */
export function WakeNavBrand() {
  return (
    <Link
      href="/"
      aria-label="Wake home"
      className="inline-flex h-10 shrink-0 items-center gap-2.5 rounded-sm transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
    >
      <img
        src={FIGMA_ASSETS.roundSun}
        alt=""
        className="block aspect-[2/1] h-8 max-h-8 w-auto object-scale-down"
        draggable={false}
      />
      <img
        src="/assets/WAKE.svg"
        alt=""
        className="h-[1.35rem] w-auto max-h-[1.35rem] translate-y-[0.5px] object-contain object-left sm:h-6 sm:max-h-6"
        draggable={false}
      />
    </Link>
  );
}
