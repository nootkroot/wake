"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";

const navPillInactive =
  "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors";
const navPillActive =
  "rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90";

function isSuggestionsListOrDetail(pathname: string) {
  if (pathname === "/suggestions") return true;
  if (pathname.startsWith("/suggestions/") && !pathname.startsWith("/suggestions/new")) {
    return true;
  }
  return false;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useSiteLanguage();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-primary">Wa</span>ke
        </Link>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          <Link
            href="/issues"
            className={pathname.startsWith("/issues") ? navPillActive : navPillInactive}
          >
            {t("issues", "Issues")}
          </Link>
          <Link
            href="/suggestions"
            className={isSuggestionsListOrDetail(pathname) ? navPillActive : navPillInactive}
          >
            {t("suggestions", "Suggestions")}
          </Link>
          <Link
            href="/legislation"
            className={pathname.startsWith("/legislation") ? navPillActive : navPillInactive}
          >
            {t("legislation", "Legislation")}
          </Link>
          <Link
            href="/dashboard"
            className={pathname.startsWith("/dashboard") ? navPillActive : navPillInactive}
          >
            {t("dashboard", "Dashboard")}
          </Link>
          <Link
            href="/suggestions/new"
            className={pathname.startsWith("/suggestions/new") ? navPillActive : navPillInactive}
          >
            {t("submit", "Submit")}
          </Link>
          <LanguageSelect />
          <AuthButtons />
        </div>
      </nav>
    </header>
  );
}

