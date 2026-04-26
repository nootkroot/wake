import { NextResponse, type NextRequest } from "next/server";

// Coarse role-based route guard. Real auth (JWT verification) happens in the
// Next.js server layer using @supabase/ssr; this middleware only ensures
// that a stable session cookie exists for anonymous voting and reporting,
// and gates the legislator/admin route trees behind a role cookie.

const ROLE_COOKIE = "wake_role";
const SESSION_COOKIE = "wake_session";

function ensureSessionCookie(req: NextRequest, res: NextResponse) {
  if (!req.cookies.get(SESSION_COOKIE)) {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    res.cookies.set({
      name: SESSION_COOKIE,
      value: id,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const role = req.cookies.get(ROLE_COOKIE)?.value ?? "anon";

  if (url.pathname.startsWith("/admin") && role !== "admin") {
    const dest = url.clone();
    dest.pathname = "/";
    dest.searchParams.set("auth", "admin-required");
    return NextResponse.redirect(dest);
  }

  if (url.pathname.startsWith("/dashboard") && !["legislator", "admin"].includes(role)) {
    const dest = url.clone();
    dest.pathname = "/";
    dest.searchParams.set("auth", "legislator-required");
    return NextResponse.redirect(dest);
  }

  return ensureSessionCookie(req, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|locales|api/og).*)"],
};
