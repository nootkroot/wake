"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { browserClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => browserClient(), []);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function initRecoverySession() {
      setInitializing(true);
      setError(null);

      // Newer Supabase flows use auth code in query params.
      const code =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("code")
          : null;
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          setInitializing(false);
          return;
        }
      } else {
        // Legacy flows return access/refresh token in URL hash.
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        if (hash) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setSessionError) {
              setError(setSessionError.message);
              setInitializing(false);
              return;
            }
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setHasRecoverySession(Boolean(session));
      if (!session) {
        setError("Recovery link is invalid or expired. Request a new reset email.");
      }
      setInitializing(false);
    }

    initRecoverySession();
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasRecoverySession) {
      setError("Recovery link is invalid or expired. Request a new reset email.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated. Redirecting to login...");
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1000);
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="New password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-green-500">{message}</p>}
            <Button type="submit" disabled={busy || initializing || !hasRecoverySession}>
              {busy ? "Updating..." : "Update password"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Back to{" "}
            <Link href="/login" className="text-primary hover:underline">
              log in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
