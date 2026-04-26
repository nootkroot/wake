export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          Wake · Hackathon edition · Anonymous voting · Verified submissions
        </div>
      </footer>
    </>
  );
}
