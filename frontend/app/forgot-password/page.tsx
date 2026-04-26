"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { browserClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => browserClient(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setBusy(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setMessage("If that email exists, a reset link has been sent.");
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-green-500">{message}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send reset link"}
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
