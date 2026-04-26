"use client";

import { SITE_LANGUAGES, type SiteLocale } from "@/lib/site-i18n";
import { useSiteLanguage } from "./SiteLanguageProvider";

export function LanguageSelect() {
  const { locale, setLocale, t } = useSiteLanguage();

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{t("language", "Language")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as SiteLocale)}
        aria-label={t("language", "Language")}
        className="rounded border border-border bg-transparent px-2 py-1 text-xs"
      >
        {SITE_LANGUAGES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );
}

