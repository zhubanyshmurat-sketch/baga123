"use client";

import { HeartHandshake, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/Button";
import { phoneHref } from "@/lib/phone";
import { Link } from "@/i18n/navigation";
import type { ContactView } from "@/lib/content/localize";

/**
 * Gentle support message shown when a sensitive question is answered with an alarming option.
 * Deliberately avoids clinical or frightening wording.
 */
export function SupportCard({ contacts }: { contacts: ContactView[] }) {
  const t = useTranslations("tests");
  const tu = useTranslations("urgent");
  const tn = useTranslations("nav");

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-card border border-coral bg-coral-soft p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <HeartHandshake className="mt-1 size-6 shrink-0 text-coral-strong" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold">{t("supportTitle")}</h2>
          <p className="mt-1">{t("supportText")}</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {contacts.slice(0, 2).map((c) => (
          <li key={c.id}>
            <a href={phoneHref(c.phone)} className={buttonClass("coral", "md", "w-full")}>
              <Phone className="size-4" aria-hidden="true" />
              {tu("call")}: {c.phone}
            </a>
            <p className="mt-1 text-center text-sm">{c.name}</p>
          </li>
        ))}
      </ul>
      <Link
        href="/help"
        className="mt-3 inline-flex min-h-11 items-center font-semibold text-coral-strong underline underline-offset-4"
      >
        {tn("help")}
      </Link>
    </section>
  );
}
