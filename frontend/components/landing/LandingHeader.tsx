"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";

const navUpper =
  "shrink-0 text-base font-medium uppercase tracking-[0.12em] text-white transition-colors hover:text-[#FFE374]";
const authLink =
  "shrink-0 text-base font-medium text-white transition-colors hover:text-[#FFE374]";
const signUpBtn =
  "shrink-0 rounded-md border border-white/40 px-3 py-1.5 text-base font-medium text-white transition-colors hover:bg-white/10";

/**
 * Landing-only: full-width black band, exactly five actions confined to the
 * viewport’s right half (flex, w-1/2, justify-end). No Legislation / Submit / language.
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
        className="fixed right-0 top-0 z-[26] flex h-[5.5rem] w-1/2 max-w-[50vw] items-center justify-end gap-6 bg-black pr-6 sm:gap-8 md:gap-10 md:pr-14"
      >
        <Link href="/issues" className={navUpper}>
          {t("issues", "Issues")}
        </Link>
        <Link href="/suggestions" className={navUpper}>
          {t("suggestions", "Suggestions")}
        </Link>
        <Link href="/dashboard" className={navUpper}>
          {t("dashboard", "Dashboard")}
        </Link>
        <Link href="/login" className={`${authLink} ml-2 sm:ml-4 md:ml-8`}>
          {t("login", "Log in")}
        </Link>
        <Link href="/signup" className={signUpBtn}>
          {t("signup", "Sign up")}
        </Link>
      </nav>
    </>
  );
}
