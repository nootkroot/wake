"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 flex-wrap">
      <Link
        href="/dashboard"
        className={
          "rounded-md border px-3 py-1 text-sm " +
          (pathname === "/dashboard" || pathname.startsWith("/dashboard?")
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border")
        }
      >
        Dashboard
      </Link>
      <Link
        href="/dashboard/map"
        className={
          "rounded-md border px-3 py-1 text-sm " +
          (pathname.startsWith("/dashboard/map")
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border")
        }
      >
        Map view
      </Link>
      <Link
        href="/dashboard/demographics"
        className={
          "rounded-md border px-3 py-1 text-sm " +
          (pathname.startsWith("/dashboard/demographics")
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border")
        }
      >
        Demographics
      </Link>
    </div>
  );
}
