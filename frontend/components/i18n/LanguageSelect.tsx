"use client";

import { SITE_LANGUAGES, type SiteLocale } from "@/lib/site-i18n";
import { useSiteLanguage } from "./SiteLanguageProvider";

type LanguageSelectProps = {
  /** default: label + select. chrome: word "Language" + bordered select. chromeIcon: globe only (header). */
  variant?: "default" | "chrome" | "chromeIcon";
};

/** Wireframe globe: sphere + meridian + equator (reads clearly at 20px). */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" strokeLinecap="round" />
      <ellipse cx="12" cy="12" rx="4" ry="9" strokeLinecap="round" />
      <path strokeLinecap="round" d="M3 12h18" />
    </svg>
  );
}

export function LanguageSelect({ variant = "default" }: LanguageSelectProps) {
  const { locale, setLocale, t } = useSiteLanguage();
  const chrome = variant === "chrome";
  const chromeIcon = variant === "chromeIcon";

  if (chromeIcon) {
    const label = t("language", "Language");
    return (
      <label
        className="relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/40 text-white transition-colors hover:bg-white/10"
        title={label}
      >
        <GlobeIcon className="pointer-events-none h-5 w-5" />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as SiteLocale)}
          aria-label={label}
          className="wake-language-select absolute inset-0 cursor-pointer opacity-0 [color-scheme:light]"
        >
          {SITE_LANGUAGES.map((entry) => (
            <option key={entry.code} value={entry.code} className="bg-white text-neutral-900">
              {entry.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label
      className={
        chrome
          ? "inline-flex h-10 shrink-0 items-center gap-2 text-base font-medium leading-none text-white"
          : "flex items-center gap-2 text-xs text-muted-foreground"
      }
    >
      <span className="whitespace-nowrap">{t("language", "Language")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as SiteLocale)}
        aria-label={t("language", "Language")}
        className={
          chrome
            ? "wake-language-select h-9 rounded-md border border-white/40 bg-white px-2 text-sm leading-normal text-neutral-900 [color-scheme:light]"
            : "wake-language-select rounded border border-border px-2 py-1 text-xs [color-scheme:light]"
        }
      >
        {SITE_LANGUAGES.map((entry) => (
          <option key={entry.code} value={entry.code} className="bg-white text-neutral-900">
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );
}
