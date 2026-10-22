import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/Container";
import { privacySections, privacyUpdated } from "@/content/legal";
import type { Locale } from "@/i18n/routing";
import { CONTACT_EMAIL, LEGAL_REVIEWED } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return buildMetadata({ locale, path: "/privacy", title: t("title"), description: t("lead") });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: "privacy" }),
    getFormatter({ locale }),
  ]);

  return (
    <Container narrow className="py-10">
      <PageHeader title={t("title")} lead={t("lead")} />
      <p className="mb-6 text-sm text-muted">
        {t("updated", { date: format.dateTime(new Date(privacyUpdated), { dateStyle: "long" }) })}
      </p>
      {!LEGAL_REVIEWED && (
        <p role="note" className="mb-8 rounded-2xl border border-coral bg-coral-soft px-4 py-3 text-sm font-medium">
          {t("draft")}
        </p>
      )}

      <div className="space-y-8">
        {privacySections.map((section) => {
          const items = section.body.map((b) => b[locale]);
          // Consecutive "- " lines become one list.
          const blocks: { list: boolean; lines: string[] }[] = [];
          for (const line of items) {
            const isItem = line.startsWith("- ");
            const last = blocks[blocks.length - 1];
            if (last && last.list === isItem && isItem) last.lines.push(line.slice(2));
            else blocks.push({ list: isItem, lines: [isItem ? line.slice(2) : line] });
          }
          return (
            <section key={section.title.ru}>
              <h2 className="text-xl font-bold">{section.title[locale]}</h2>
              <div className="mt-3 space-y-3 leading-relaxed">
                {blocks.map((b, i) =>
                  b.list ? (
                    <ul key={i} className="list-disc space-y-1.5 pl-6">
                      {b.lines.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i}>{b.lines[0]}</p>
                  ),
                )}
              </div>
            </section>
          );
        })}

        <section>
          <h2 className="text-xl font-bold">{t("contactTitle")}</h2>
          <p className="mt-3">
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary-strong underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
            ) : (
              t("contactSoon")
            )}
          </p>
        </section>
      </div>
    </Container>
  );
}
