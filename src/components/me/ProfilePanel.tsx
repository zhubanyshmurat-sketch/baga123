"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { clearLocalData } from "@/lib/personal/local-store";
import { deleteAccountAction, recordConsentAction } from "@/lib/personal/actions";
import { getBrowserClient } from "@/lib/supabase/client";
import { saveThemePref, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface Profile {
  display_name: string | null;
  language: Locale;
  theme: ThemePref;
  consent_at: string | null;
  role: "student" | "editor" | "admin";
}

const fieldClass = "min-h-12 w-full rounded-2xl border border-border-strong bg-bg px-4 text-base";

function Choice({
  checked,
  onChange,
  name,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 font-semibold transition",
        checked ? "border-primary bg-primary-soft text-primary-strong" : "border-border-strong hover:border-primary",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

/** Shown to someone who signed in with Google and has not yet given consent to data processing. */
export function ConsentGate({ onDone }: { onDone: () => void }) {
  const t = useTranslations("auth");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function accept() {
    setBusy(true);
    setFailed(false);
    const result = await recordConsentAction();
    setBusy(false);
    if (result.ok) onDone();
    else setFailed(true);
  }

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-xl font-bold">{t("consentTitle")}</h2>
      <p className="mt-2 text-muted">{t("consentText")}</p>
      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
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
      {failed && (
        <p role="alert" className="mt-3 font-medium text-coral-strong">
          {t("errors.generic")}
        </p>
      )}
      <Button className="mt-5" disabled={!checked || busy} onClick={accept}>
        {t("consentAccept")}
      </Button>
    </Card>
  );
}

export function ProfileSettings({ userId, profile, onSaved }: { userId: string; profile: Profile; onSaved: () => void }) {
  const t = useTranslations("me");
  const th = useTranslations("header");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const [name, setName] = useState(profile.display_name ?? "");
  const [language, setLanguage] = useState<Locale>(profile.language);
  const [theme, setTheme] = useState<ThemePref>(profile.theme);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getBrowserClient();
    if (!supabase) return;
    setState("saving");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 60) || null, language, theme })
      .eq("id", userId);
    if (error) {
      setState("error");
      return;
    }
    saveThemePref(theme);
    setState("saved");
    onSaved();
    if (language !== locale) router.replace(pathname, { locale: language });
  }

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-xl font-bold">{t("settingsTitle")}</h2>
      <form onSubmit={save} className="mt-5 space-y-6">
        <div>
          <label htmlFor="display-name" className="mb-2 block font-semibold">
            {t("displayName")}
          </label>
          <input
            id="display-name"
            type="text"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <fieldset>
          <legend className="mb-2 font-semibold">{t("language")}</legend>
          <div className="flex flex-wrap gap-2">
            <Choice name="lang" checked={language === "kk"} onChange={() => setLanguage("kk")}>
              Қазақша
            </Choice>
            <Choice name="lang" checked={language === "ru"} onChange={() => setLanguage("ru")}>
              Русский
            </Choice>
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-semibold">{t("theme")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["system", "light", "dark"] as const).map((v) => (
              <Choice key={v} name="theme" checked={theme === v} onChange={() => setTheme(v)}>
                {v === "system" ? th("themeSystem") : v === "light" ? th("themeLight") : th("themeDark")}
              </Choice>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={state === "saving"}>
            {state === "saving" ? tc("saving") : t("saveSettings")}
          </Button>
          <p role="status" aria-live="polite" className="text-sm font-medium">
            {state === "saved" && <span className="text-primary-strong">{t("settingsSaved")}</span>}
            {state === "error" && <span className="text-coral-strong">{tc("genericError")}</span>}
          </p>
        </div>
      </form>
    </Card>
  );
}

export function DeleteAccount() {
  const t = useTranslations("me");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const word = t("deleteWord");

  async function remove() {
    setState("busy");
    const result = await deleteAccountAction();
    if (!result.ok) {
      setState("error");
      return;
    }
    clearLocalData();
    await getBrowserClient()?.auth.signOut({ scope: "local" });
    setState("done");
    // A full page load (not client navigation) so every cached view of the deleted account is dropped.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    setTimeout(() => window.location.assign(`/${locale}`), 1800);
  }

  return (
    <Card className="border-coral/60 p-6 sm:p-8">
      <h2 className="text-xl font-bold">{t("dangerTitle")}</h2>
      <p className="mt-2 text-muted">{t("dangerText")}</p>

      {state === "done" ? (
        <p role="status" className="mt-5 font-semibold text-primary-strong">
          {t("deleted")}
        </p>
      ) : !open ? (
        <Button variant="danger" className="mt-5" onClick={() => setOpen(true)}>
          {t("deleteAccount")}
        </Button>
      ) : (
        <div className="mt-5 space-y-3" role="group" aria-labelledby="delete-confirm-title">
          <p id="delete-confirm-title" className="font-semibold">
            {t("deleteConfirmTitle")}
          </p>
          <label htmlFor="delete-word" className="block text-sm text-muted">
            {t("deleteConfirmText", { word })}
          </label>
          <input
            id="delete-word"
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className={fieldClass}
          />
          {state === "error" && (
            <p role="alert" className="font-medium text-coral-strong">
              {tc("genericError")}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              disabled={typed.trim().toLocaleUpperCase() !== word || state === "busy"}
              onClick={remove}
            >
              {t("deleteConfirm")}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
