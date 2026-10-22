"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePersonalStore } from "@/lib/personal/use-store";

const STEPS = [
  { key: "see", count: 5 },
  { key: "touch", count: 4 },
  { key: "hear", count: 3 },
  { key: "smell", count: 2 },
  { key: "taste", count: 1 },
] as const;

/** 5-4-3-2-1 grounding wizard. Answers stay in the browser and are not stored. */
export function GroundingExercise({ slug }: { slug: string }) {
  const t = useTranslations("exercises.grounding");
  const tex = useTranslations("exercises");
  const store = usePersonalStore();
  const [step, setStep] = useState(-1); // -1 intro, 0..4 steps, 5 done
  const [answers, setAnswers] = useState<string[][]>(() => STEPS.map((s) => Array(s.count).fill("")));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (step >= 0) headingRef.current?.focus();
  }, [step]);

  function begin() {
    startedAt.current = Date.now();
    setStep(0);
  }

  function next() {
    if (step === STEPS.length - 1) {
      void store?.logExercise(slug, (Date.now() - startedAt.current) / 1000).catch(() => undefined);
    }
    setStep((s) => s + 1);
  }

  function setAnswer(stepIndex: number, i: number, value: string) {
    setAnswers((prev) =>
      prev.map((row, r) => (r === stepIndex ? row.map((v, c) => (c === i ? value : v)) : row)),
    );
  }

  if (step === -1) {
    return (
      <Card className="p-6 sm:p-8">
        <p className="text-lg">{t("intro")}</p>
        <Button size="lg" className="mt-6" onClick={begin}>
          {t("start")}
        </Button>
      </Card>
    );
  }

  if (step >= STEPS.length) {
    return (
      <Card className="p-6 text-center sm:p-10">
        <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
          <Check className="size-8" aria-hidden="true" />
        </span>
        <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl font-bold outline-none">
          {t("doneTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">{t("doneText")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setAnswers(STEPS.map((s) => Array(s.count).fill("")));
              setStep(-1);
            }}
          >
            {t("again")}
          </Button>
          <ButtonLink href="/" variant="soft">
            {tex("markMood")}
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const current = STEPS[step];
  return (
    <Card className="p-6 sm:p-8">
      <p className="text-sm font-semibold text-muted">{t("step", { current: step + 1, total: STEPS.length })}</p>
      <div
        className="mt-2 flex gap-1.5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-label={t("step", { current: step + 1, total: STEPS.length })}
      >
        {STEPS.map((s, i) => (
          <span key={s.key} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-surface-2"}`} />
        ))}
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-bold leading-snug outline-none">
        {t(current.key)}
      </h2>
      <div className="mt-5 space-y-3">
        {answers[step].map((value, i) => (
          <div key={i}>
            <label htmlFor={`g-${step}-${i}`} className="sr-only-text">
              {t("itemLabel", { n: i + 1 })}
            </label>
            <input
              id={`g-${step}-${i}`}
              type="text"
              value={value}
              maxLength={120}
              autoComplete="off"
              placeholder={t("placeholder")}
              onChange={(e) => setAnswer(step, i, e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-border-strong bg-bg px-4 text-base"
            />
          </div>
        ))}
      </div>
      <div className="mt-7 flex justify-end">
        <Button onClick={next}>{step === STEPS.length - 1 ? t("finish") : t("next")}</Button>
      </div>
    </Card>
  );
}
