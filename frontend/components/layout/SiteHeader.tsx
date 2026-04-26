"use client";

import Link from "next/link";
import { WakeNavBrand } from "@/components/brand/WakeNavBrand";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { appHeaderNavUpper } from "@/components/layout/appHeaderClasses";
import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";

/**
 * In-app routes: same nav + auth look as {@link LandingHeader}, full width,
 * plus Legislation / Submit / compact globe language (landing omits those).
 */
export function SiteHeader({ showBrand = true }: { showBrand?: boolean }) {
  const { t } = useSiteLanguage();

  return (
    <header className="relative flex items-center top-0 z-[100] h-[5.5rem] overflow-hidden">
      <div
          aria-hidden
          className="absolute inset-0 h-[10rem] bg-black/10 backdrop-blur-[15px]"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 25%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 25%, transparent 100%)',
          }}
        />
      <nav
        aria-label="Primary"
        className="relative z-10 flex min-w-0 w-full items-center gap-3 px-4 sm:gap-4 sm:px-5 md:gap-6 md:px-6"
      >
        
        {showBrand ? <div className="shrink-0"><WakeNavBrand /></div> : null}

        <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-x-5 md:gap-x-7 lg:mx-auto lg:gap-x-9">
            <Link href="/issues" className={`${appHeaderNavUpper} shrink-0 whitespace-nowrap`}>
              {t("issues", "Issues")}
            </Link>
            <Link href="/suggestions" className={`${appHeaderNavUpper} shrink-0 whitespace-nowrap`}>
              {t("suggestions", "Suggestions")}
            </Link>
            <Link href="/legislation" className={`${appHeaderNavUpper} shrink-0 whitespace-nowrap`}>
              {t("legislation", "Legislation")}
            </Link>
            <Link href="/dashboard" className={`${appHeaderNavUpper} shrink-0 whitespace-nowrap`}>
              {t("dashboard", "Dashboard")}
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 flex-nowrap items-center gap-4 md:gap-5">
          <AuthButtons variant="chrome" />
          <LanguageSelect variant="chromeIcon" />
        </div>
      </nav>
    </header>
  );
}
