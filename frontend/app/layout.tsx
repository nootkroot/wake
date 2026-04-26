import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteLanguageProvider } from "@/components/i18n/SiteLanguageProvider";
import { AutoPageTranslator } from "@/components/i18n/AutoPageTranslator";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { normalizeSiteLocale, SITE_LANGUAGE_COOKIE } from "@/lib/site-i18n";

export const metadata: Metadata = {
  title: "Wake",
  description:
    "Surface, rank, and translate civic issues — citizen voice meets legislative search.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const initialLocale = normalizeSiteLocale(cookieStore.get(SITE_LANGUAGE_COOKIE)?.value);
  return (
    <html lang={initialLocale}>
      <body className="min-h-screen antialiased">
        <SiteLanguageProvider initialLocale={initialLocale}>
          <AutoPageTranslator />
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          <SiteFooter />
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
