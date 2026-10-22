import { ChevronLeft, Clock, ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArticleCard, ExerciseCard } from "@/components/content/cards";
import { FavoriteButton } from "@/components/content/FavoriteButton";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getArticle, getArticles, getTopicBundle } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const articles = await getArticles();
  return routing.locales.flatMap((locale) => articles.map((a) => ({ locale, slug: a.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return buildMetadata({
    locale,
    path: `/articles/${slug}`,
    title: article.title[locale],
    description: article.excerpt[locale],
  });
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await getArticle(slug);
  if (!article) notFound();

  const [t, tt, tn, format, bundle, all] = await Promise.all([
    getTranslations({ locale, namespace: "articles" }),
    getTranslations({ locale, namespace: "tests" }),
    getTranslations({ locale, namespace: "nav" }),
    getFormatter({ locale }),
    getTopicBundle(article.topicSlug),
    getArticles(),
  ]);
  const topicTitle = bundle?.topic.title[locale];
  const related = all
    .filter((a) => a.slug !== slug && a.topicSlug === article.topicSlug)
    .slice(0, 2);
  const steps = article.todaySteps[locale];

  return (
    <Container narrow className="py-8 md:py-12">
      <Link
        href="/articles"
        className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-strong"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t("back")}
      </Link>

      <article>
        <header>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {topicTitle && (
              <Link href={`/topics/${article.topicSlug}`}>
                <Badge tone="primary">{topicTitle}</Badge>
              </Link>
            )}
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Clock className="size-4" aria-hidden="true" />
              {t("readingTime", { count: article.readingTime })}
            </span>
            <time className="text-sm text-muted" dateTime={article.publishedAt}>
              {t("published", {
                date: format.dateTime(new Date(article.publishedAt), { dateStyle: "long" }),
              })}
            </time>
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{article.title[locale]}</h1>
          <p className="mt-4 text-lg text-muted">{article.excerpt[locale]}</p>
          <div className="mt-5">
            <FavoriteButton type="article" slug={article.slug} />
          </div>
        </header>

        <div className="mt-8">
          <MarkdownContent>{article.body[locale]}</MarkdownContent>
        </div>

        {steps.length > 0 && (
          <section className="mt-10 rounded-card bg-primary-soft p-6" aria-labelledby="today">
            <h2 id="today" className="text-xl font-bold">
              {t("todayTitle")}
            </h2>
            <ol className="mt-4 space-y-3">
              {steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {bundle?.test && (
          <section className="mt-6 flex flex-col gap-3 rounded-card border border-border bg-surface p-6 sm:flex-row sm:items-center">
            <ClipboardCheck className="size-8 shrink-0 text-accent-strong" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-bold">{t("relatedTest")}</h2>
              <p className="text-muted">{bundle.test.title[locale]}</p>
            </div>
            <ButtonLink href={`/tests/${bundle.test.slug}`} variant="secondary">
              {tt("start")}
            </ButtonLink>
          </section>
        )}

        {article.sources.length > 0 && (
          <section className="mt-10" aria-labelledby="sources">
            <h2 id="sources" className="text-lg font-bold">
              {t("sources")}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
              {article.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        )}
      </article>

      {bundle && bundle.exercises.length > 0 && (
        <section className="mt-12" aria-labelledby="rel-ex">
          <h2 id="rel-ex" className="mb-4 text-xl font-bold">
            {t("relatedExercises")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {bundle.exercises.slice(0, 2).map((e) => (
              <li key={e.slug}>
                <ExerciseCard exercise={e} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="rel-art">
          <h2 id="rel-art" className="mb-4 text-xl font-bold">
            {t("relatedArticles")}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {related.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} locale={locale} topicTitle={topicTitle} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-10 text-center text-sm text-muted">
        <Link href="/help" className="underline underline-offset-4">
          {tn("help")}
        </Link>
      </p>
    </Container>
  );
}
