"use client";

import { ArrowLeft, ArrowRight, Check, Clock, ClipboardCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ExerciseTypeIcon } from "@/components/content/ExerciseTypeIcon";
import { Link } from "@/i18n/navigation";
import type { ContactView, ExerciseLink, TestView } from "@/lib/content/localize";
import { usePersonalStore } from "@/lib/personal/use-store";
import { isAlertAnswer, scoreTest, type ScoreResult } from "@/lib/tests/scoring";
import { cn } from "@/lib/utils";
import { LevelMeter } from "./LevelMeter";
import { SupportCard } from "./SupportCard";

type Stage = "intro" | "questions" | "result";
type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  test: TestView;
  topicTitle?: string;
  contacts: ContactView[];
  /** Exercises that thresholds may refer to, by slug. */
  exercises: ExerciseLink[];
}

export function TestRunner({ test, topicTitle, contacts, exercises }: Props) {
  const t = useTranslations("tests");
  const tc = useTranslations("common");
  const store = usePersonalStore();

  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => test.questions.map(() => undefined));
  const [result, setResult] = useState<ScoreResult<TestView> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const total = test.questions.length;
  const question = test.questions[index];
  const answer = answers[index];
  const alertShown = question ? isAlertAnswer(question, answer) : false;

  // Move focus to the new heading so screen-reader users hear the next question.
  useEffect(() => {
    if (stage !== "intro") headingRef.current?.focus();
  }, [stage, index]);

  if (total === 0) {
    return <Card className="p-6">{t("noQuestions")}</Card>;
  }

  function choose(value: number) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  async function finish() {
    const values = answers.map((a) => a as number);
    const scored = scoreTest(test, values);
    setResult(scored);
    setStage("result");
    if (!store) return;
    setSaveState("saving");
    try {
      await store.saveTest(test, values);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function restart() {
    setAnswers(test.questions.map(() => undefined));
    setIndex(0);
    setResult(null);
    setSaveState("idle");
    setStage("questions");
  }

  if (stage === "intro") {
    return (
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {topicTitle && <Badge tone="accent">{topicTitle}</Badge>}
          <Badge>{t("approximate")}</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight">{test.title}</h1>
        <p className="mt-3 text-lg text-muted">{test.description}</p>
        <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-muted">
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheck className="size-4" aria-hidden="true" />
            {t("questionsCount", { count: total })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden="true" />
            {t("duration", { count: test.durationMin })}
          </span>
        </p>
        <p className="mt-4">{t("intro")}</p>
        <Disclaimer className="mt-5" />
        <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={() => setStage("questions")}>
          {t("start")}
          <ArrowRight className="size-5" aria-hidden="true" />
        </Button>
      </Card>
    );
  }

  if (stage === "result" && result) {
    const th = result.threshold;
    const levelName = t(`level.${result.level}`);
    const recommended = th.exerciseSlugs
      .map((slug) => exercises.find((e) => e.slug === slug))
      .filter((e): e is ExerciseLink => Boolean(e));

    return (
      <div className="space-y-5">
        {result.alert && <SupportCard contacts={contacts} />}

        <Card className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-strong">{t("result")}</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-3xl font-bold leading-tight tracking-tight outline-none"
          >
            {th.title}
          </h1>
          <div className="mt-5 max-w-md">
            <LevelMeter level={result.level} label={t("meter", { level: levelName })} />
            <p className="mt-2 flex items-center justify-between text-sm text-muted">
              <span className="font-semibold text-fg">{levelName}</span>
              <span>{t("score", { score: result.score, max: result.maxScore })}</span>
            </p>
          </div>

          <h2 className="mt-7 text-xl font-bold">{t("meaning")}</h2>
          <p className="mt-2 text-lg leading-relaxed">{th.summary}</p>

          <h2 className="mt-7 text-xl font-bold">{t("recommendations")}</h2>
          <ol className="mt-3 space-y-3">
            {th.recommendations.map((r, i) => (
              <li key={r} className="flex gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-strong">
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ol>

          {recommended.length > 0 && (
            <>
              <h2 className="mt-7 text-xl font-bold">{t("exercises")}</h2>
              <ul className="mt-3 flex flex-wrap gap-3">
                {recommended.map((e) => (
                  <li key={e.slug}>
                    <Link
                      href={`/exercises/${e.slug}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-soft px-4 font-semibold text-accent-strong hover:brightness-95"
                    >
                      <ExerciseTypeIcon type={e.type} className="size-4" />
                      {e.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className="mt-7 text-xl font-bold">{t("specialist")}</h2>
          <p className="mt-2 leading-relaxed">{th.specialist}</p>

          <Disclaimer className="mt-7" />

          <p className="mt-4 min-h-6 text-sm text-muted" role="status" aria-live="polite">
            {saveState === "saving" && tc("saving")}
            {saveState === "saved" && (
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary-strong" aria-hidden="true" />
                {store?.kind === "remote" ? t("savedToAccount") : t("savedOnDevice")}
              </span>
            )}
            {saveState === "error" && <span className="text-coral-strong">{t("saveError")}</span>}
          </p>
          {store?.kind === "local" && saveState === "saved" && (
            <p className="mt-1 text-sm">
              <Link href="/auth" className="font-semibold text-primary-strong underline underline-offset-4">
                {t("loginToSave")}
              </Link>
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={restart}>
              {t("retake")}
            </Button>
            <ButtonLink href={`/topics/${test.topicSlug}`} variant="soft">
              {t("toTopic")}
            </ButtonLink>
            <ButtonLink href="/tests" variant="ghost">
              {t("allTests")}
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  // Questions, one per screen.
  const isLast = index === total - 1;
  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 text-sm font-semibold text-muted">
          <span>{test.title}</span>
          <span>{t("questionOf", { current: index + 1, total })}</span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progress")}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + (answer === undefined ? 0 : 1)}
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((index + (answer === undefined ? 0 : 1)) / total) * 100}%` }}
          />
        </div>

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-7 text-2xl font-bold leading-snug outline-none"
        >
          {question.text}
        </h2>

        <div role="radiogroup" aria-label={t("answers")} className="mt-6 grid gap-3">
          {question.options.map((o) => {
            const active = answer === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(o.value)}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-lg font-medium transition",
                  active
                    ? "border-primary bg-primary-soft text-fg"
                    : "border-border-strong bg-bg hover:border-primary",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-primary-strong bg-primary-strong text-bg" : "border-border-strong",
                  )}
                  aria-hidden="true"
                >
                  {active && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => (index === 0 ? setStage("intro") : setIndex(index - 1))}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("prev")}
          </Button>
          <Button
            disabled={answer === undefined}
            onClick={() => (isLast ? finish() : setIndex(index + 1))}
          >
            {isLast ? t("finish") : t("next")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>

      {alertShown && <SupportCard contacts={contacts} />}
      <Disclaimer />
    </div>
  );
}
