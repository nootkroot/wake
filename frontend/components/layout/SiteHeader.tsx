"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { appHeaderNavUpper } from "@/components/layout/appHeaderClasses";
import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";

const homeWordmark =
  "inline-flex h-10 shrink-0 items-center text-base font-semibold leading-none tracking-tight text-white transition-colors hover:text-[#FFE374]";

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
        className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 md:gap-6 md:px-10"
      >
        <Link href="/" className={homeWordmark}>
          Wake
        </Link>

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
