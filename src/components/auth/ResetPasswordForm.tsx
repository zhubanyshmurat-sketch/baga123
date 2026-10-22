"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSession } from "@/components/layout/SessionProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { ready, user, configured } = useSession();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "weak" | "error">("idle");

  if (!configured || (ready && !user)) {
    // No session means the reset link was opened without a valid code.
    return (
      <Card className="p-6 sm:p-8">
        <p className="text-lg">{t("errors.callback")}</p>
        <ButtonLink href="/auth" className="mt-5">
          {t("backToLogin")}
        </ButtonLink>
      </Card>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase) return;
    setState("busy");
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) return setState("done");
    setState(error.code === "weak_password" ? "weak" : "error");
  }

  if (state === "done") {
    return (
      <Card className="p-6 sm:p-8">
        <p role="status" className="text-lg font-semibold">
          {t("resetDone")}
        </p>
        <ButtonLink href="/me" className="mt-5">
          {t("toCabinet")}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="new-password" className="mb-2 block font-semibold">
            {t("password")}
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="new-password-hint"
            className="min-h-12 w-full rounded-2xl border border-border-strong bg-bg px-4 text-base"
          />
          <p id="new-password-hint" className="mt-1 text-sm text-muted">
            {t("passwordHint")}
          </p>
        </div>
        {(state === "weak" || state === "error") && (
          <p role="alert" className="font-medium text-coral-strong">
            {state === "weak" ? t("errors.weak") : tc("genericError")}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={state === "busy" || !ready}>
          {t("resetSave")}
        </Button>
      </form>
    </Card>
  );
}
