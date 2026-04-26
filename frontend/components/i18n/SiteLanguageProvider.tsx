"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getSiteMessages,
  normalizeSiteLocale,
  SITE_LANGUAGE_COOKIE,
  type SiteLocale,
} from "@/lib/site-i18n";

type I18nContextValue = {
  locale: SiteLocale;
  setLocale: (next: SiteLocale) => void;
  t: (key: string, fallback?: string) => string;
};

const SiteLanguageContext = createContext<I18nContextValue | null>(null);

export function SiteLanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: SiteLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<SiteLocale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `${SITE_LANGUAGE_COOKIE}=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.localStorage.setItem(SITE_LANGUAGE_COOKIE, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const messages = getSiteMessages(locale);
    return {
      locale,
      setLocale: (next) => setLocaleState(normalizeSiteLocale(next)),
      t: (key, fallback) => messages[key] ?? fallback ?? key,
    };
  }, [locale]);

  return <SiteLanguageContext.Provider value={value}>{children}</SiteLanguageContext.Provider>;
}

export function useSiteLanguage() {
  const value = useContext(SiteLanguageContext);
  if (!value) {
    throw new Error("useSiteLanguage must be used within SiteLanguageProvider");
  }
  return value;
}

