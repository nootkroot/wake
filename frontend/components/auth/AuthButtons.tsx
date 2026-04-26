"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  appHeaderAuthLink,
  appHeaderSignUpBtn,
} from "@/components/layout/appHeaderClasses";
import { browserClient, getRoleFromUser, setRoleCookie } from "@/lib/supabase";
import { useSiteLanguage } from "@/components/i18n/SiteLanguageProvider";

type AuthButtonsProps = {
  /** Matches landing / SiteHeader: white type, gold hover, outlined sign up. */
  variant?: "default" | "chrome";
};

export function AuthButtons({ variant = "default" }: AuthButtonsProps) {
  const supabase = useMemo(() => browserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useSiteLanguage();
  const chrome = variant === "chrome";

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
    return (
      <span
        className={
          chrome
            ? "inline-flex h-10 shrink-0 items-center text-sm text-white/50"
            : "text-xs text-muted-foreground"
        }
      >
        {t("checking_auth", "Checking auth...")}
      </span>
    );
  }

  if (!user) {
    return (
      <div className="flex shrink-0 flex-nowrap items-center gap-4 sm:gap-5 md:gap-6">
        <Link href="/login" className={chrome ? appHeaderAuthLink : "hover:text-foreground"}>
          {t("login", "Log in")}
        </Link>
        <Link
          href="/signup"
          className={
            chrome ? appHeaderSignUpBtn : "rounded-md border border-border px-3 py-1.5 hover:bg-muted"
          }
        >
          {t("signup", "Sign up")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-3 sm:gap-4">
      <span
        className={
          chrome
            ? "inline-flex h-10 max-w-[160px] items-center truncate text-sm leading-none text-white/70 sm:max-w-[200px]"
            : "max-w-[180px] truncate text-xs text-muted-foreground"
        }
        title={user.email}
      >
        {user.email ?? t("signed_in", "Signed in")}
      </span>
      <button
        type="button"
        onClick={signOut}
        className={
          chrome ? appHeaderSignUpBtn : "rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        }
      >
        {t("logout", "Log out")}
      </button>
    </div>
  );
}
