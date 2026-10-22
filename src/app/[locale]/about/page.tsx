import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Container, PageHeader } from "@/components/ui/Container";
import { Disclaimer } from "@/components/ui/Disclaimer";
import type { Locale } from "@/i18n/routing";
import { CONTACT_EMAIL } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const revalidate = false;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return buildMetadata({ locale, path: "/about", title: t("title"), description: t("mission") });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });
  const principles = t.raw("principles") as string[];

  return (
    <Container narrow className="py-10">
      <PageHeader title={t("title")} />

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold">{t("missionTitle")}</h2>
          <p className="mt-2 text-lg leading-relaxed">{t("mission")}</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">{t("notTitle")}</h2>
          <p className="mt-2 leading-relaxed">{t("not")}</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">{t("approachTitle")}</h2>
          <p className="mt-2 leading-relaxed">{t("approach")}</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">{t("principlesTitle")}</h2>
          <ul className="mt-3 space-y-2.5">
            {principles.map((p) => (
              <li key={p} className="flex gap-3">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-xl font-bold">{t("teamTitle")}</h2>
            <p className="mt-2 text-muted">{t("teamText")}</p>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-bold">{t("consultantTitle")}</h2>
            <p className="mt-2 text-muted">{t("consultantText")}</p>
          </Card>
        </div>
        <Card className="p-6">
          <h2 className="text-xl font-bold">{t("contactTitle")}</h2>
          <p className="mt-2">{t("contactText")}</p>
          {CONTACT_EMAIL && (
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-primary-strong underline underline-offset-4"
            >
              <Mail className="size-4" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          )}
        </Card>
        <section aria-labelledby="about-disclaimer">
          <h2 id="about-disclaimer" className="sr-only-text">
            {t("disclaimerTitle")}
          </h2>
          <p role="note" className="rounded-2xl bg-accent-soft px-4 py-3">
            {t("disclaimer")}
          </p>
          <Disclaimer className="mt-3" />
        </section>
      </div>
    </Container>
  );
}
