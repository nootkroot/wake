import "./globals.css";
import "./globals.css";
import type { Metadata } from "next";
import { HeaderNavigation } from "@/components/layout/HeaderNavigation";

export const metadata: Metadata = {
  title: "Wake",
  description:
    "Surface, rank, and translate civic issues — citizen voice meets legislative search.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-border">
          <HeaderNavigation />
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="border-t border-border mt-16">
          <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
            Wake · Hackathon edition · Anonymous voting · Verified submissions
          </div>
        </footer>
      </body>
    </html>
  );
}
