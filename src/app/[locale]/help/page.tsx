import { HeartHandshake, Phone, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { phoneHref } from "@/lib/phone";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container, PageHeader } from "@/components/ui/Container";
import type { Locale } from "@/i18n/routing";
import { getHelpContacts } from "@/lib/content";
import { localizeContact } from "@/lib/content/localize";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });
  return buildMetadata({ locale, path: "/help", title: t("title"), description: t("lead") });
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tu] = await Promise.all([
    getTranslations({ locale, namespace: "help" }),
    getTranslations({ locale, namespace: "urgent" }),
  ]);
  const contacts = (await getHelpContacts()).map((c) => localizeContact(c, locale));
  const when = t.raw("when") as string[];
  const friend = t.raw("friend") as string[];

  return (
    <Container narrow className="py-10">
      <PageHeader title={t("title")} lead={t("lead")} />

      <p className="mb-8 flex items-start gap-3 rounded-card bg-coral-soft p-5 text-lg font-semibold">
        <HeartHandshake className="mt-1 size-6 shrink-0 text-coral-strong" aria-hidden="true" />
        {t("emergency")}
      </p>

      <section aria-labelledby="contacts">
        <h2 id="contacts" className="mb-4 text-2xl font-bold">
          {t("contacts")}
        </h2>
        <ul className="space-y-4">
          {contacts.map((c) => (
            <li key={c.id}>
              <Card className="p-5">
                <h3 className="text-lg font-bold">{c.name}</h3>
                {c.description && <p className="mt-1 text-muted">{c.description}</p>}
                <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
                  {c.hours && (
                    <div>
                      <dt className="inline text-muted">{t("hours")}: </dt>
                      <dd className="inline font-semibold">{c.hours}</dd>
                    </div>
                  )}
                  {c.city && (
                    <div>
                      <dt className="inline text-muted">{t("city")}: </dt>
                      <dd className="inline font-semibold">{c.city}</dd>
                    </div>
                  )}
                </dl>
                {!c.verified && <p className="mt-2 text-sm text-muted">{t("unverified")}</p>}
                <a href={phoneHref(c.phone)} className={buttonClass("coral", "lg", "mt-4 w-full sm:w-auto")}>
                  <Phone className="size-5" aria-hidden="true" />
                  {tu("call")}: {c.phone}
                </a>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="when">
        <h2 id="when" className="mb-4 text-2xl font-bold">
          {t("whenTitle")}
        </h2>
        <ul className="space-y-3">
          {when.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="friend">
        <h2 id="friend" className="mb-4 text-2xl font-bold">
          {t("friendTitle")}
        </h2>
        <ol className="space-y-3">
          {friend.map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-strong">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-card bg-accent-soft p-6">
        <h2 className="text-xl font-bold">{t("universityTitle")}</h2>
        <p className="mt-2">{t("universityText")}</p>
      </section>

      <p className="mt-8 flex items-center gap-2 text-sm text-muted">
        <WifiOff className="size-4" aria-hidden="true" />
        {t("offlineNote")}
      </p>
    </Container>
  );
}
