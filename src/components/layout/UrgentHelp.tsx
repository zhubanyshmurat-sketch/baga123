"use client";

import { HeartHandshake, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { Link } from "@/i18n/navigation";
import type { ContactView } from "@/lib/content/localize";
import { buttonClass } from "@/components/ui/Button";
import { phoneHref } from "@/lib/phone";
import { cn } from "@/lib/utils";

/** The always-visible "Urgent help" button. One tap opens the contacts, no sign-in needed. */
export function UrgentHelp({
  contacts,
  className,
  variant = "header",
}: {
  contacts: ContactView[];
  className?: string;
  variant?: "header" | "footer";
}) {
  const t = useTranslations("urgent");
  const th = useTranslations("header");
  const tc = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label={th("urgentHelpHint")}
        className={cn(
          variant === "header"
            ? "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-coral px-3.5 text-sm font-bold text-on-coral transition hover:brightness-95 sm:px-4"
            : "inline-flex min-h-11 items-center gap-2 rounded-full bg-coral px-5 font-bold text-on-coral transition hover:brightness-95",
          className,
        )}
      >
        <Phone className="size-4 shrink-0" aria-hidden="true" />
        <span>{th("urgentHelp")}</span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="urgent-title"
        onClick={(e) => {
          // A click on the backdrop targets the dialog element itself.
          if (e.target === ref.current) ref.current?.close();
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-card border border-border bg-surface p-0 text-fg shadow-soft"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral-strong">
              <HeartHandshake className="size-5" aria-hidden="true" />
            </span>
            <h2 id="urgent-title" className="flex-1 text-xl font-bold leading-snug">
              {t("title")}
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={tc("close")}
              className="-mr-2 -mt-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-3 text-muted">{t("text")}</p>

          <ul className="mt-5 space-y-3">
            {contacts.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-bg p-4">
                <p className="font-semibold">{c.name}</p>
                {c.description && <p className="mt-0.5 text-sm text-muted">{c.description}</p>}
                <p className="mt-1 text-sm text-muted">
                  {c.hours && (
                    <>
                      {t("hours")}: {c.hours}
                    </>
                  )}
                  {!c.verified && (
                    <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                      {t("unverified")}
                    </span>
                  )}
                </p>
                <a
                  href={phoneHref(c.phone)}
                  className={buttonClass("coral", "lg", "mt-3 w-full text-lg")}
                >
                  <Phone className="size-5" aria-hidden="true" />
                  {t("call")}: {c.phone}
                </a>
              </li>
            ))}
          </ul>

          <Link
            href="/help"
            onClick={() => ref.current?.close()}
            className={buttonClass("secondary", "md", "mt-5 w-full")}
          >
            {t("allContacts")}
          </Link>
        </div>
      </dialog>
    </>
  );
}
