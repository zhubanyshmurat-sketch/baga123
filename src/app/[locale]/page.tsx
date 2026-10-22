import { ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleCard, ExerciseCard, TopicCard } from "@/components/content/cards";
import { HeroArt } from "@/components/content/HeroArt";
import { MoodCheckin } from "@/components/content/MoodCheckin";
import { SearchBox } from "@/components/content/SearchBox";
import { ButtonLink } from "@/components/ui/Button";
import { Container, SectionHeading } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getArticles, getExercises, getTopics } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return buildMetadata({ locale, path: "", description: t("lead") });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, tn] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const [topics, exercises, articles] = await Promise.all([getTopics(), getExercises(), getArticles()]);
  const topicTitles = new Map(topics.map((tp) => [tp.slug, tp.title[locale]]));
  const popular = exercises.filter((e) => e.popular).slice(0, 4);

  return (
    <>
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-8 py-10 md:grid-cols-[1.15fr_0.85fr] md:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-strong">{t("eyebrow")}</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block">{t("titleLine1")}</span>
              <span className="block text-primary-strong">{t("titleLine2")}</span>
              <span className="block text-accent-strong">{t("titleLine3")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{t("lead")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/tests" size="lg">
                {t("ctaTest")}
              </ButtonLink>
              <ButtonLink href="/exercises/breathing-478" variant="secondary" size="lg">
                {t("ctaBreathe")}
              </ButtonLink>
            </div>
            <SearchBox locale={locale} className="mt-6 max-w-xl sm:hidden" />
          </div>
          <div className="mx-auto w-full max-w-sm md:max-w-md">
            <HeroArt className="h-auto w-full" />
          </div>
        </Container>
      </section>

      <Container className="-mt-2 md:-mt-6">
        <MoodCheckin />
      </Container>

      <Container className="mt-16">
        <SectionHeading
          title={t("topicsTitle")}
          lead={t("topicsLead")}
          action={
            <Link href="/topics" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary-strong">
              {tc("seeAll")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic, i) => (
            <li key={topic.slug}>
              <TopicCard topic={topic} locale={locale} index={i} />
            </li>
          ))}
        </ul>
      </Container>

      <Container className="mt-16">
        <SectionHeading
          title={t("exercisesTitle")}
          lead={t("exercisesLead")}
          action={
            <Link href="/exercises" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary-strong">
              {tn("exercises")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((exercise) => (
            <li key={exercise.slug}>
              <ExerciseCard exercise={exercise} locale={locale} />
            </li>
          ))}
        </ul>
      </Container>

      <Container className="mt-16">
        <SectionHeading
          title={t("articlesTitle")}
          action={
            <Link href="/articles" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary-strong">
              {tc("seeAll")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <ul className="grid gap-4 md:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <li key={article.slug}>
              <ArticleCard article={article} locale={locale} topicTitle={topicTitles.get(article.topicSlug)} />
            </li>
          ))}
        </ul>
      </Container>

      <Container className="mt-16 grid gap-4 md:grid-cols-2">
        <section className="rounded-card bg-coral-soft p-6 sm:p-8" aria-labelledby="home-help">
          <HeartHandshake className="size-8 text-coral-strong" aria-hidden="true" />
          <h2 id="home-help" className="mt-3 text-2xl font-bold">
            {t("helpTitle")}
          </h2>
          <p className="mt-2 text-fg">{t("helpText")}</p>
          <ButtonLink href="/help" variant="coral" className="mt-5">
            {t("helpButton")}
          </ButtonLink>
        </section>
        <section className="rounded-card bg-primary-soft p-6 sm:p-8" aria-labelledby="home-privacy">
          <ShieldCheck className="size-8 text-primary-strong" aria-hidden="true" />
          <h2 id="home-privacy" className="mt-3 text-2xl font-bold">
            {t("privacyTitle")}
          </h2>
          <p className="mt-2 text-fg">{t("privacyText")}</p>
          <ButtonLink href="/about" variant="secondary" className="mt-5">
            {tn("about")}
          </ButtonLink>
        </section>
      </Container>
    </>
  );
}
