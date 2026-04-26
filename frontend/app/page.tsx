import Link from "next/link";

const ROLES = [
  {
    title: "Citizen",
    body: "Submit issues, vote anonymously, search local legislation.",
    cta: "Browse issues",
    href: "/issues",
  },
  {
    title: "Legislator",
    body: "Aggregated dashboard, demographic breakdowns, period exports.",
    cta: "Open dashboard",
    href: "/dashboard",
  },
  {
    title: "Admin",
    body: "Review moderation queues, resolve flagged content, and monitor policy health.",
    cta: "Open moderation dashboard",
    href: "/moderation",
  },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center space-y-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight">
          A pulse on civic life — surfaced, ranked, translated.
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Wake compiles citizen suggestions and geolocated issues, scores
          them with Gemma 4, and hands legislators a ranked report on every
          voting period close.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/suggestions/new"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Submit a suggestion
          </Link>
          <Link
            href="/legislation"
            className="rounded-md border border-border px-4 py-2"
          >
            Search legislation
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((r) => (
          <Link
            key={r.title}
            href={r.href}
            className="rounded-lg border border-border p-5 hover:border-primary transition-colors"
          >
            <div className="text-sm uppercase tracking-wider text-muted-foreground">
              {r.title}
            </div>
            <p className="mt-2 text-sm">{r.body}</p>
            <div className="mt-4 text-sm font-medium text-primary">
              {r.cta} →
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
