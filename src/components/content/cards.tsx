import { ArrowRight, Clock, ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, cardLinkClass } from "@/components/ui/Card";
import { TopicIcon } from "@/components/ui/TopicIcon";
import type { Article, Exercise, Locale, PsyTest, Topic } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { ExerciseTypeIcon } from "./ExerciseTypeIcon";

const tints = [
  "bg-primary-soft text-primary-strong",
  "bg-accent-soft text-accent-strong",
] as const;

export function topicTint(index: number) {
  return tints[index % tints.length];
}

export function TopicCard({ topic, locale, index }: { topic: Topic; locale: Locale; index: number }) {
  return (
    <Link href={`/topics/${topic.slug}`} className={cn(cardLinkClass, "flex h-full flex-col")}>
      <span
        className={cn("mb-4 inline-flex size-12 items-center justify-center rounded-2xl", topicTint(index))}
      >
        <TopicIcon name={topic.icon} className="size-6" />
      </span>
      <h3 className="text-lg font-bold leading-snug">{topic.title[locale]}</h3>
      <p className="mt-2 flex-1 text-muted">{topic.description[locale]}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-strong">
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export async function ArticleCard({
  article,
  locale,
  topicTitle,
}: {
  article: Article;
  locale: Locale;
  topicTitle?: string;
}) {
  const t = await getTranslations({ locale, namespace: "articles" });
  return (
    <Link href={`/articles/${article.slug}`} className={cn(cardLinkClass, "flex h-full flex-col")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {topicTitle && <Badge tone="primary">{topicTitle}</Badge>}
        <span className="inline-flex items-center gap-1 text-sm text-muted">
          <Clock className="size-3.5" aria-hidden="true" />
          {t("readingTime", { count: article.readingTime })}
        </span>
      </div>
      <h3 className="text-lg font-bold leading-snug group-hover:text-primary-strong">
        {article.title[locale]}
      </h3>
      <p className="mt-2 flex-1 text-muted">{article.excerpt[locale]}</p>
    </Link>
  );
}

export async function TestCard({
  test,
  locale,
  topicTitle,
}: {
  test: PsyTest;
  locale: Locale;
  topicTitle?: string;
}) {
  const t = await getTranslations({ locale, namespace: "tests" });
  return (
    <Link href={`/tests/${test.slug}`} className={cn(cardLinkClass, "flex h-full flex-col")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {topicTitle && <Badge tone="accent">{topicTitle}</Badge>}
        <Badge>{t("approximate")}</Badge>
      </div>
      <h3 className="text-lg font-bold leading-snug group-hover:text-primary-strong">
        {test.title[locale]}
      </h3>
      <p className="mt-2 flex-1 text-muted">{test.description[locale]}</p>
      <p className="mt-4 flex items-center gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <ClipboardCheck className="size-4" aria-hidden="true" />
          {t("questionsCount", { count: test.questions.length })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-4" aria-hidden="true" />
          {t("duration", { count: test.durationMin })}
        </span>
      </p>
    </Link>
  );
}

export async function ExerciseCard({ exercise, locale }: { exercise: Exercise; locale: Locale }) {
  const [t, tc] = await Promise.all([
    getTranslations({ locale, namespace: "exercises" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  return (
    <Link href={`/exercises/${exercise.slug}`} className={cn(cardLinkClass, "flex h-full flex-col")}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
          <ExerciseTypeIcon type={exercise.type} className="size-6" />
        </span>
        <Badge>{t(`types.${exercise.type}`)}</Badge>
      </div>
      <h3 className="text-lg font-bold leading-snug group-hover:text-primary-strong">
        {exercise.title[locale]}
      </h3>
      <p className="mt-2 flex-1 text-muted">{exercise.description[locale]}</p>
      <p className="mt-4 inline-flex items-center gap-1 text-sm text-muted">
        <Clock className="size-4" aria-hidden="true" />
        {tc("min", { count: exercise.durationMin })}
      </p>
    </Link>
  );
}
