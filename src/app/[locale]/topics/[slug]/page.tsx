import { ChevronLeft, ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArticleCard, ExerciseCard, topicTint } from "@/components/content/cards";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { TopicIcon } from "@/components/ui/TopicIcon";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getTopicBundle, getTopics } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const topics = await getTopics();
  return routing.locales.flatMap((locale) => topics.map((t) => ({ locale, slug: t.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const bundle = await getTopicBundle(slug);
  if (!bundle) return {};
  return buildMetadata({
    locale,
    path: `/topics/${slug}`,
    title: bundle.topic.title[locale],
    description: bundle.topic.description[locale],
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-soft sm:p-7">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function TopicPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const bundle = await getTopicBundle(slug);
  if (!bundle) notFound();
  const { topic, test, exercises, articles } = bundle;
  const [t, tn, tt] = await Promise.all([
    getTranslations({ locale, namespace: "topics" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "tests" }),
  ]);
  const topics = await getTopics();
  const index = topics.findIndex((x) => x.slug === slug);
  const c = topic.content[locale];

  return (
    <Container className="py-8 md:py-12">
      <Link
        href="/topics"
        className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-strong"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t("allTopics")}
      </Link>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          className={cn("inline-flex size-16 shrink-0 items-center justify-center rounded-3xl", topicTint(Math.max(index, 0)))}
        >
          <TopicIcon name={topic.icon} className="size-8" />
        </span>
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{topic.title[locale]}</h1>
          <p className="mt-2 max-w-2xl text-lg text-muted">{topic.description[locale]}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Section title={t("what")}>
            <p className="text-lg leading-relaxed">{c.what}</p>
          </Section>
          <Section title={t("signs")}>
            <BulletList items={c.signs} />
          </Section>
          <Section title={t("causes")}>
            <BulletList items={c.causes} />
          </Section>
          <Section title={t("now")}>
            <ol className="space-y-3">
              {c.tips.map((tip, i) => (
                <li key={tip} className="flex gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-strong">
                    {i + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ol>
          </Section>
          <section className="rounded-card bg-accent-soft p-5 sm:p-7">
            <h2 className="text-xl font-bold">{t("specialist")}</h2>
            <p className="mt-3 leading-relaxed">{c.specialist}</p>
            <ButtonLink href="/help" variant="coral" size="sm" className="mt-4">
              {tn("help")}
            </ButtonLink>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {test && (
            <section className="rounded-card bg-primary-soft p-5">
              <ClipboardCheck className="size-7 text-primary-strong" aria-hidden="true" />
              <h2 className="mt-2 text-lg font-bold">{t("takeTest")}</h2>
              <p className="mt-1 text-sm">{t("takeTestText")}</p>
              <p className="mt-2 font-semibold">{test.title[locale]}</p>
              <p className="text-sm text-muted">
                {tt("questionsCount", { count: test.questions.length })} · {tt("duration", { count: test.durationMin })}
              </p>
              <ButtonLink href={`/tests/${test.slug}`} className="mt-4 w-full">
                {tt("start")}
              </ButtonLink>
            </section>
          )}
          {exercises.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">{t("tryExercise")}</h2>
              <ul className="space-y-3">
                {exercises.map((e) => (
                  <li key={e.slug}>
                    <ExerciseCard exercise={e} locale={locale} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {articles.length > 0 && (
        <section className="mt-12" aria-labelledby="topic-articles">
          <h2 id="topic-articles" className="mb-5 text-2xl font-bold">
            {t("articles")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {articles.map((a) => (
              <li key={a.slug}>
                <ArticleCard article={a} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
