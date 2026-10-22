import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleBrowser } from "@/components/content/ArticleBrowser";
import { Container, PageHeader } from "@/components/ui/Container";
import type { Locale } from "@/i18n/routing";
import { getArticles, getTopics } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "articles" });
  return buildMetadata({ locale, path: "/articles", title: t("title"), description: t("lead") });
}

export default async function ArticlesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "articles" });
  const [articles, topics] = await Promise.all([getArticles(), getTopics()]);

  return (
    <Container className="py-10">
      <PageHeader title={t("title")} lead={t("lead")} />
      <ArticleBrowser
        items={articles.map((a) => ({
          slug: a.slug,
          title: a.title[locale],
          excerpt: a.excerpt[locale],
          topicSlug: a.topicSlug,
          tags: a.tags[locale],
          readingTime: a.readingTime,
        }))}
        topics={topics.map((tp) => ({ slug: tp.slug, title: tp.title[locale] }))}
      />
    </Container>
  );
}
