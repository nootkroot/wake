"use client";

import Link from "next/link";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";

export function SiteHeader() {
  const { t } = useSiteLanguage();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-primary">Wa</span>ke
        </Link>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/issues" className="hover:text-foreground">
            {t("issues", "Issues")}
          </Link>
          <Link href="/suggestions" className="hover:text-foreground">
            {t("suggestions", "Suggestions")}
          </Link>
          <Link href="/legislation" className="hover:text-foreground">
            {t("legislation", "Legislation")}
          </Link>
          <Link href="/dashboard" className="hover:text-foreground">
            {t("dashboard", "Dashboard")}
          </Link>
          <Link
            href="/suggestions/new"
            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
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

