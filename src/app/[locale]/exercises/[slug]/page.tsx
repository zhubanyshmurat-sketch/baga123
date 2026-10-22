import { ChevronLeft, Clock } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BreathingExercise } from "@/components/exercises/BreathingExercise";
import { DiaryExercise } from "@/components/exercises/DiaryExercise";
import { GroundingExercise } from "@/components/exercises/GroundingExercise";
import { PlannerExercise } from "@/components/exercises/PlannerExercise";
import { PomodoroExercise } from "@/components/exercises/PomodoroExercise";
import { Badge, Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getExercise, getExercises, getTopics } from "@/lib/content";
import type { Exercise } from "@/lib/content/types";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const exercises = await getExercises();
  return routing.locales.flatMap((locale) => exercises.map((e) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const exercise = await getExercise(slug);
  if (!exercise) return {};
  return buildMetadata({
    locale,
    path: `/exercises/${slug}`,
    title: exercise.title[locale],
    description: exercise.description[locale],
  });
}

function Runner({ exercise }: { exercise: Exercise }) {
  switch (exercise.type) {
    case "breathing":
      return <BreathingExercise slug={exercise.slug} config={exercise.config} />;
    case "grounding":
      return <GroundingExercise slug={exercise.slug} />;
    case "diary":
      return <DiaryExercise />;
    case "planner":
      return <PlannerExercise />;
    case "pomodoro":
      return <PomodoroExercise slug={exercise.slug} config={exercise.config} />;
  }
}

export default async function ExercisePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const exercise = await getExercise(slug);
  if (!exercise) notFound();
  const [t, tc, topics] = await Promise.all([
    getTranslations({ locale, namespace: "exercises" }),
    getTranslations({ locale, namespace: "common" }),
    getTopics(),
  ]);
  const related = topics.filter((tp) => exercise.topicSlugs.includes(tp.slug));
  const steps = exercise.instructions[locale];

  return (
    <Container className="py-8 md:py-12">
      <Link
        href="/exercises"
        className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-strong"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t("backToList")}
      </Link>

      <header className="mb-8 max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{t(`types.${exercise.type}`)}</Badge>
          <span className="inline-flex items-center gap-1 text-sm text-muted">
            <Clock className="size-4" aria-hidden="true" />
            {tc("min", { count: exercise.durationMin })}
          </span>
        </div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{exercise.title[locale]}</h1>
        <p className="mt-3 text-lg text-muted">{exercise.description[locale]}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="order-2 lg:order-1">
          <Runner exercise={exercise} />
        </div>
        <aside className="order-1 space-y-5 lg:order-2">
          {steps.length > 0 && (
            <Card className="p-5">
              <h2 className="text-lg font-bold">{t("howTo")}</h2>
              <ol className="mt-3 space-y-2.5">
                {steps.map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-strong">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          {related.length > 0 && (
            <Card className="p-5">
              <h2 className="text-lg font-bold">{t("related")}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {related.map((tp) => (
                  <li key={tp.slug}>
                    <Link
                      href={`/topics/${tp.slug}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm font-semibold hover:bg-primary-soft"
                    >
                      {tp.title[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </Container>
  );
}
