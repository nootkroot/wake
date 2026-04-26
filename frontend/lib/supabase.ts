// Browser-only Supabase client factory for auth flows in client components.
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export type AppRole = "anon" | "citizen" | "legislator" | "admin";

export function browserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function getRoleFromUser(user: User | null): AppRole {
  if (!user) return "anon";
  const rawRole = (user.user_metadata?.role as string | undefined)?.toLowerCase();
  if (rawRole === "admin") return "admin";
  if (rawRole === "legislator") return "legislator";
  return "citizen";
}

export function setRoleCookie(role: AppRole) {
  document.cookie = `wake_role=${role}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
