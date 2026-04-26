// Minimal next-intl-style helper. Static JSON files live in /public/locales.

export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function getBrowserLang(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.slice(0, 2) as Locale;
  return SUPPORTED_LOCALES.includes(lang) ? lang : "en";
}

export async function loadMessages(locale: Locale): Promise<Record<string, string>> {
  try {
    const resp = await fetch(`/locales/${locale}/common.json`, { cache: "force-cache" });
    if (!resp.ok) throw new Error("locale missing");
    return await resp.json();
  } catch {
    return {};
  }
}
