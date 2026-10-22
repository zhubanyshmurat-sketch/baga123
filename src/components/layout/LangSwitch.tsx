"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSession } from "./SessionProvider";

const options: { locale: Locale; label: string; name: string }[] = [
  { locale: "kk", label: "ҚАЗ", name: "Қазақша" },
  { locale: "ru", label: "РУС", name: "Русский" },
];

export function LangSwitch() {
  const t = useTranslations("header");
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === current) return;
    const search = window.location.search;
    startTransition(() => {
      router.replace(`${pathname}${search}`, { locale: next });
    });
    // Remember the choice in the profile too (best effort, the cookie already remembers it here).
    if (user) {
      void getBrowserClient()?.from("profiles").update({ language: next }).eq("id", user.id);
    }
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex rounded-full border border-border-strong p-0.5",
        pending && "opacity-70",
      )}
    >
      {options.map((o) => (
        <button
          key={o.locale}
          type="button"
          lang={o.locale}
          aria-pressed={current === o.locale}
          aria-label={o.name}
          title={o.name}
          onClick={() => change(o.locale)}
          className={cn(
            "min-h-10 min-w-11 rounded-full px-2.5 text-xs font-bold tracking-wide transition-colors",
            current === o.locale ? "bg-primary text-on-primary" : "text-fg hover:bg-surface-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
