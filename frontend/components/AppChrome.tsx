import Link from "next/link";
import { AuthButtons } from "@/components/auth/AuthButtons";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            <span className="text-primary">Wa</span>ke
          </Link>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/issues" className="hover:text-foreground">Issues</Link>
            <Link href="/suggestions" className="hover:text-foreground">Suggestions</Link>
            <Link href="/legislation" className="hover:text-foreground">Legislation</Link>
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link
              href="/suggestions/new"
              className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
            >
              Submit
            </Link>
            <AuthButtons />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          Wake · Hackathon edition · Anonymous voting · Verified submissions
        </div>
      </footer>
    </>
  );
}
