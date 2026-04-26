import Link from "next/link";

type Reason = "legislator-required" | "admin-required";

function messageFor(reason: Reason | string | undefined) {
  if (reason === "admin-required") {
    return {
      title: "Whoops - admin account required",
      body: "You must be signed in as an admin to view this page.",
    };
  }
  return {
    title: "Whoops - legislator account required",
    body: "You must be a legislator to view this page.",
  };
}

export default function AccessDeniedPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const content = messageFor(searchParams.reason);

  return (
    <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{content.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{content.body}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Hackathon mode: role access is controlled by the role selected at signup.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/login"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Create account
        </Link>
        <Link
          href="/"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
