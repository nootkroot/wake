import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteLanguageProvider } from "@/components/i18n/SiteLanguageProvider";
import { AutoPageTranslator } from "@/components/i18n/AutoPageTranslator";
import { AppVisualChrome } from "@/components/layout/AppVisualChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { normalizeSiteLocale, SITE_LANGUAGE_COOKIE } from "@/lib/site-i18n";

export const metadata: Metadata = {
  title: "Wake — Let Our Voices Rise",
  description:
    "Talk about your city's issues. Find out your citizens' views.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const initialLocale = normalizeSiteLocale(cookieStore.get(SITE_LANGUAGE_COOKIE)?.value);
  return (
    <html lang={initialLocale}>
      <body className="min-h-screen antialiased bg-black">
        <SiteLanguageProvider initialLocale={initialLocale}>
          <AutoPageTranslator />
          <AppVisualChrome>{children}</AppVisualChrome>
          <SiteFooter />
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
