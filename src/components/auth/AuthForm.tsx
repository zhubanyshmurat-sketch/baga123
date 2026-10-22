"use client";

import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSession } from "@/components/layout/SessionProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Link, useRouter } from "@/i18n/navigation";
import { CONSENT_VERSION } from "@/lib/constants";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "login" | "register" | "forgot";
type ErrorKey = "invalid" | "exists" | "weak" | "email" | "notConfirmed" | "rate" | "generic" | "callback";
type FormError = ErrorKey | "consent";

const fieldClass = "min-h-12 w-full rounded-2xl border border-border-strong bg-bg px-4 text-base";

/** Maps a Supabase auth error to one of our friendly, translated messages. */
function errorKey(error: { code?: string; message?: string; status?: number }): ErrorKey {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || message.includes("invalid login")) return "invalid";
  if (code === "user_already_exists" || message.includes("already registered")) return "exists";
  if (code === "weak_password" || message.includes("password should")) return "weak";
  if (code === "email_address_invalid" || code === "validation_failed") return "email";
  if (code === "email_not_confirmed") return "notConfirmed";
  if (code.includes("rate_limit") || error.status === 429) return "rate";
  return "generic";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.27c0-.8-.07-1.56-.2-2.3H12v4.35h5.9a5.05 5.05 0 0 1-2.19 3.31v2.75h3.54c2.07-1.9 3.25-4.72 3.25-8.11Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.67l-3.54-2.75c-.98.66-2.24 1.05-3.74 1.05-2.87 0-5.3-1.94-6.17-4.55H2.17v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.83 14.08a6.6 6.6 0 0 1 0-4.16V7.08H2.17a11 11 0 0 0 0 9.84l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.37c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.46 2.1 14.97 1 12 1A11 11 0 0 0 2.17 7.08l3.66 2.84C6.7 7.31 9.13 5.37 12 5.37Z" />
    </svg>
  );
}

export function AuthForm({ initialError }: { initialError?: ErrorKey }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { ready, user, configured } = useSession();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FormError | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // The OAuth callback redirects here with ?error=callback when the code exchange failed.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL, which only exists in the browser
    if (new URLSearchParams(window.location.search).get("error") === "callback") setError("callback");
  }, []);

  if (!configured) {
    return (
      <Card className="p-6 sm:p-8">
        <p className="text-lg">{t("notConfigured")}</p>
        <ButtonLink href="/tests" className="mt-5">
          {tc("start")}
        </ButtonLink>
      </Card>
    );
  }

  if (ready && user) {
    return (
      <Card className="p-6 sm:p-8">
        <p className="text-lg font-semibold">{t("alreadyIn")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/me">{t("toCabinet")}</ButtonLink>
          <Button
            variant="secondary"
            onClick={async () => {
              await getBrowserClient()?.auth.signOut();
              router.refresh();
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t("loggedOutAction")}
          </Button>
        </div>
      </Card>
    );
  }

  const redirectTo = (next: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/${locale}${next}`)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase) return;
    setError(null);
    setNotice(null);

    if (mode === "register" && !consent) {
      setError("consent");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) return setError(errorKey(err));
        router.replace("/me");
        router.refresh();
      } else if (mode === "register") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo("/me"),
            data: {
              display_name: name.trim(),
              language: locale,
              consent: true,
              consent_version: CONSENT_VERSION,
            },
          },
        });
        if (err) return setError(errorKey(err));
        // An existing address comes back as a "user" without identities (to avoid leaking accounts).
        if (data.user && data.user.identities?.length === 0) return setError("exists");
        if (data.session) {
          router.replace("/me");
          router.refresh();
        } else {
          setNotice(t("checkEmail", { email }));
        }
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo("/auth/reset"),
        });
        if (err && errorKey(err) === "rate") return setError("rate");
        // Same answer whether or not the address exists.
        setNotice(t("forgotSent"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const supabase = getBrowserClient();
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo("/me") },
    });
    if (err) setError("generic");
  }

  const tabs: { id: Exclude<Mode, "forgot">; label: string }[] = [
    { id: "login", label: t("tabLogin") },
    { id: "register", label: t("tabRegister") },
  ];

  return (
    <Card className="p-6 sm:p-8">
      {mode !== "forgot" ? (
        <div role="tablist" className="mb-6 flex gap-1 rounded-full bg-surface-2 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => {
                setMode(tab.id);
                setError(null);
                setNotice(null);
              }}
              className={cn(
                "min-h-11 flex-1 rounded-full px-3 font-semibold transition-colors",
                mode === tab.id ? "bg-surface shadow-soft" : "text-muted hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-xl font-bold">{t("forgotTitle")}</h2>
          <p className="mt-1 text-muted">{t("forgotText")}</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
        {mode === "register" && (
          <div>
            <label htmlFor="auth-name" className="mb-2 block font-semibold">
              {t("displayName")}
            </label>
            <input
              id="auth-name"
              type="text"
              autoComplete="nickname"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className="mb-2 block font-semibold">
            {t("email")}
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </div>
        {mode !== "forgot" && (
          <div>
            <label htmlFor="auth-password" className="mb-2 block font-semibold">
              {t("password")}
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={mode === "register" ? "auth-password-hint" : undefined}
              className={fieldClass}
            />
            {mode === "register" && (
              <p id="auth-password-hint" className="mt-1 text-sm text-muted">
                {t("passwordHint")}
              </p>
            )}
          </div>
        )}

        {mode === "register" && (
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-[var(--primary-strong)]"
            />
            <span>
              {t.rich("consent", {
                link: (chunks) => (
                  <Link href="/privacy" className="font-semibold text-primary-strong underline underline-offset-4">
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
        )}

        <div aria-live="polite" role="status">
          {error && (
            <p role="alert" className="font-medium text-coral-strong">
              {error === "consent" ? t("consentRequired") : t(`errors.${error}`)}
            </p>
          )}
          {notice && <p className="font-medium text-primary-strong">{notice}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {mode === "login" ? t("login") : mode === "register" ? t("register") : t("forgotSend")}
        </Button>
      </form>

      {mode === "login" && (
        <button
          type="button"
          onClick={() => {
            setMode("forgot");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 min-h-11 text-sm font-semibold text-primary-strong underline underline-offset-4"
        >
          {t("forgot")}
        </button>
      )}
      {mode === "forgot" && (
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 min-h-11 text-sm font-semibold text-primary-strong underline underline-offset-4"
        >
          {t("backToLogin")}
        </button>
      )}

      {mode !== "forgot" && (
        <>
          <div className="my-6 flex items-center gap-3 text-sm text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="secondary" size="lg" className="w-full" onClick={google}>
            <GoogleMark />
            {t("google")}
          </Button>
          {mode === "register" && <p className="mt-3 text-sm text-muted">{t("consentText")}</p>}
        </>
      )}
    </Card>
  );
}
