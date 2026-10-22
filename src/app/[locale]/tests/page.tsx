import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TestCard } from "@/components/content/cards";
import { Container, PageHeader } from "@/components/ui/Container";
import { Disclaimer } from "@/components/ui/Disclaimer";
import type { Locale } from "@/i18n/routing";
import { getTests, getTopics } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tests" });
  return buildMetadata({ locale, path: "/tests", title: t("title"), description: t("lead") });
}

export default async function TestsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tests" });
  const [tests, topics] = await Promise.all([getTests(), getTopics()]);
  const topicTitles = new Map(topics.map((tp) => [tp.slug, tp.title[locale]]));

  return (
    <Container className="py-10">
      <PageHeader title={t("title")} lead={t("lead")} />
      <Disclaimer className="mb-8 max-w-2xl" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => (
          <li key={test.slug}>
            <TestCard test={test} locale={locale} topicTitle={topicTitles.get(test.topicSlug)} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
