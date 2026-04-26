"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";
import {
  appHeaderAuthLink,
  appHeaderNavUpper,
  appHeaderSignUpBtn,
} from "@/components/layout/appHeaderClasses";

/**
 * Landing-only: full-width black band + right-half nav (z below hero on the left).
 */
export function LandingHeader() {
  const { t } = useSiteLanguage();

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[25] h-[5.5rem] bg-black"
        aria-hidden
      />

      <nav
        data-no-auto-translate="true"
        aria-label="Primary"
        className="fixed right-0 top-0 z-[26] flex h-[5.5rem] w-1/2 max-w-[50vw] flex-nowrap items-center justify-end gap-6 border-b border-white/[0.06] bg-black/40 pr-6 backdrop-blur-xl backdrop-saturate-150 sm:gap-8 md:gap-10 md:pr-14"
      >
        <Link href="/issues" className={appHeaderNavUpper}>
          {t("issues", "Issues")}
        </Link>
        <Link href="/suggestions" className={appHeaderNavUpper}>
          {t("suggestions", "Suggestions")}
        </Link>
        <Link href="/dashboard" className={appHeaderNavUpper}>
          {t("dashboard", "Dashboard")}
        </Link>
        <Link href="/login" className={`${appHeaderAuthLink} ml-2 sm:ml-4 md:ml-8`}>
          {t("login", "Log in")}
        </Link>
        <Link href="/signup" className={appHeaderSignUpBtn}>
          {t("signup", "Sign up")}
        </Link>
      </nav>
    </>
  );
}
