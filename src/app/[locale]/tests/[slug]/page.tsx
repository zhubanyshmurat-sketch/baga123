import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { TestRunner } from "@/components/tests/TestRunner";
import { routing, type Locale } from "@/i18n/routing";
import { getExercises, getHelpContacts, getTest, getTests, getTopic } from "@/lib/content";
import { exerciseLink, localizeContact, localizeTest } from "@/lib/content/localize";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const tests = await getTests();
  return routing.locales.flatMap((locale) => tests.map((t) => ({ locale, slug: t.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const test = await getTest(slug);
  if (!test) return {};
  return buildMetadata({
    locale,
    path: `/tests/${slug}`,
    title: test.title[locale],
    description: test.description[locale],
  });
}

export default async function TestPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const test = await getTest(slug);
  if (!test) notFound();
  await getTranslations({ locale, namespace: "tests" });

  const [topic, exercises, contacts] = await Promise.all([
    getTopic(test.topicSlug),
    getExercises(),
    getHelpContacts(),
  ]);

  return (
    <Container narrow className="py-8 md:py-12">
      <TestRunner
        test={localizeTest(test, locale)}
        topicTitle={topic?.title[locale]}
        contacts={contacts.map((c) => localizeContact(c, locale))}
        exercises={exercises.map((e) => exerciseLink(e, locale))}
      />
    </Container>
  );
}
