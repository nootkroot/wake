"use client";

import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";

export function SiteFooter() {
  const { t } = useSiteLanguage();
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
        {t("footer", "Wake · Hackathon edition · Anonymous voting · Verified submissions")}
      </div>
    </footer>
  );
}

