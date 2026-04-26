"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SITE_LANGUAGES, type SiteLocale } from "@/lib/site-i18n";
import { cn } from "@/lib/utils";
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

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const menuListClass =
  "absolute z-[200] mt-1 min-w-[11rem] rounded-md border border-white/25 bg-black py-1 shadow-xl outline-none";
const menuItemClass =
  "flex w-full items-center px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none";
const menuItemSelectedClass = "bg-white/15 font-medium";

function currentLabel(locale: SiteLocale) {
  return SITE_LANGUAGES.find((e) => e.code === locale)?.label ?? locale;
}

function LanguageMenu({
  open,
  locale,
  onPick,
  id,
  className,
}: {
  open: boolean;
  locale: SiteLocale;
  onPick: (code: SiteLocale) => void;
  id: string;
  className?: string;
}) {
  if (!open) return null;
  return (
    <ul
      id={id}
      role="listbox"
      className={cn(menuListClass, className)}
    >
      {SITE_LANGUAGES.map((entry) => (
        <li key={entry.code} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={locale === entry.code}
            className={cn(menuItemClass, locale === entry.code && menuItemSelectedClass)}
            onClick={() => onPick(entry.code)}
          >
            {entry.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LanguageSelect({ variant = "default" }: LanguageSelectProps) {
  const { locale, setLocale, t } = useSiteLanguage();
  const chrome = variant === "chrome";
  const chromeIcon = variant === "chromeIcon";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `${useId()}-wake-language-menu`;

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (code: SiteLocale) => {
    setLocale(code);
    setOpen(false);
  };

  if (chromeIcon) {
    const label = t("language", "Language");
    return (
      <div ref={rootRef} className="relative inline-flex shrink-0">
        <button
          type="button"
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/40 text-white transition-colors hover:bg-white/10",
            open && "bg-white/10",
          )}
          title={label}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          <GlobeIcon className="h-5 w-5" />
        </button>
        <LanguageMenu
          open={open}
          locale={locale}
          onPick={pick}
          id={listId}
          className="right-0 top-full"
        />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative shrink-0",
        chrome
          ? "inline-flex h-10 items-center gap-2 text-base font-medium leading-none text-white"
          : "flex items-center gap-2 text-xs text-muted-foreground",
      )}
    >
      <span className="whitespace-nowrap">{t("language", "Language")}</span>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-white/40 bg-black text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          chrome ? "h-9 px-2 text-sm" : "px-2 py-1",
          open && "bg-white/10",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-label={t("language", "Language")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-[5.5rem] text-left">{currentLabel(locale)}</span>
        <ChevronDown className={cn("shrink-0 opacity-80", chrome ? "h-4 w-4" : "h-3.5 w-3.5")} />
      </button>
      <LanguageMenu
        open={open}
        locale={locale}
        onPick={pick}
        id={listId}
        className="right-0 top-full"
      />
    </div>
  );
}
