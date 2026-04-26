"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { getBrowserLang, loadMessages, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

const DEFAULT_MESSAGES: Record<string, string> = {
  issues: "Issues",
  suggestions: "Suggestions",
  legislation: "Legislation",
  dashboard: "Dashboard",
};

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function HeaderNavigation() {
  const [locale, setLocale] = useState<Locale>(getBrowserLang());
  const [messages, setMessages] = useState<Record<string, string>>(DEFAULT_MESSAGES);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("wake_locale");
    if (isLocale(storedLocale)) {
      setLocale(storedLocale);
      return;
    }

    setLocale(getBrowserLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("wake_locale", locale);

    let active = true;
    loadMessages(locale).then((loaded) => {
      if (!active) return;
      if (Object.keys(loaded).length > 0) {
        setMessages(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [locale]);

  const translate = (key: string) => messages[key] ?? DEFAULT_MESSAGES[key] ?? key;

  return (
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        <span className="text-primary">Wa</span>ke
      </Link>

      <div className="flex items-center gap-5 text-sm text-muted-foreground">
        <Link href="/issues" className="hover:text-foreground">
          {translate("issues")}
        </Link>
        <Link href="/suggestions" className="hover:text-foreground">
          {translate("suggestions")}
        </Link>
        <Link href="/legislation" className="hover:text-foreground">
          {translate("legislation")}
        </Link>
        <Link href="/dashboard" className="hover:text-foreground">
          {translate("dashboard")}
        </Link>
        <Link
          href="/suggestions/new"
          className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
        >
          {translate("submit") ?? "Submit"}
        </Link>

        <div>
          <label htmlFor="language" className="sr-only">
            Language
          </label>
          <select
            id="language"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {SUPPORTED_LOCALES.map((localeOption) => (
              <option key={localeOption} value={localeOption}>
                {LOCALE_NAMES[localeOption]}
              </option>
            ))}
          </select>
        </div>

        <AuthButtons />
      </div>
    </nav>
  );
}
