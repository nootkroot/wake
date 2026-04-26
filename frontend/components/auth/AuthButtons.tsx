"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { browserClient, getRoleFromUser, setRoleCookie } from "@/lib/supabase";

export function AuthButtons() {
  const supabase = useMemo(() => browserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) {
          setUser(data.user ?? null);
          setRoleCookie(getRoleFromUser(data.user ?? null));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setRoleCookie(getRoleFromUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setRoleCookie("anon");
    window.location.href = "/";
  }

  if (loading) {
    return <span className="text-xs text-muted-foreground">Checking auth...</span>;
  }

  if (!user) {
    return (
      <>
        <Link href="/login" className="hover:text-foreground">
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="max-w-[180px] truncate text-xs text-muted-foreground" title={user.email}>
        {user.email ?? "Signed in"}
      </span>
      <button
        type="button"
        onClick={signOut}
        className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
      >
        Log out
      </button>
    </>
  );
}
