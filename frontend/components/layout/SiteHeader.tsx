"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WakeNavBrand } from "@/components/brand/WakeNavBrand";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { appHeaderNavUpper } from "@/components/layout/appHeaderClasses";
import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";

/**
 * In-app routes: same nav + auth look as {@link LandingHeader}, full width,
 * plus Legislation / Submit / compact globe language (landing omits those).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useSiteLanguage();

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[100] flex h-[5.5rem] items-center bg-black">
      <nav
        aria-label="Primary"
        className="flex w-full min-w-0 items-center gap-3 px-4 sm:gap-4 sm:px-5 md:gap-6 md:px-6 lg:px-8"
      >
        <WakeNavBrand />

        <div className="flex min-w-0 flex-1 items-center justify-center gap-x-5 overflow-x-auto overscroll-x-contain md:gap-x-7 lg:gap-x-9 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/issues" className={appHeaderNavUpper}>
            {t("issues", "Issues")}
          </Link>
          <Link href="/suggestions" className={appHeaderNavUpper}>
            {t("suggestions", "Suggestions")}
          </Link>
          <Link href="/legislation" className={appHeaderNavUpper}>
            {t("legislation", "Legislation")}
          </Link>
          <Link href="/dashboard" className={appHeaderNavUpper}>
            {t("dashboard", "Dashboard")}
          </Link>
          <Link href="/suggestions/new" className={appHeaderNavUpper}>
            {t("submit", "Submit")}
          </Link>
        </div>

        <div className="flex shrink-0 flex-nowrap items-center gap-4 md:gap-5">
          <AuthButtons variant="chrome" />
          <LanguageSelect variant="chromeIcon" />
        </div>
      </nav>
    </header>
  );
}
