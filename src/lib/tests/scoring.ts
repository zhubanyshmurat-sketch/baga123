import type { Level } from "@/lib/content/types";

/**
 * The minimal shape the scoring engine needs. Both the bilingual test from the content layer
 * and the single-language test sent to the browser satisfy it, so the exact same code
 * scores a test in the browser (guests) and on the server (saved results).
 */
export interface ScorableTest {
  questions: ReadonlyArray<{
    options: ReadonlyArray<{ value: number; weight: number; alert?: boolean }>;
    sensitive?: boolean;
  }>;
  thresholds: ReadonlyArray<{ level: Level; min: number; max: number }>;
}

export interface ScoreResult<T extends ScorableTest> {
  score: number;
  maxScore: number;
  level: Level;
  threshold: T["thresholds"][number];
  /** True when a sensitive question was answered with an alarming option. */
  alert: boolean;
}

type Question = ScorableTest["questions"][number];

/** Highest score reachable on a test: the best option of every question. */
export function maxScore(test: ScorableTest): number {
  return test.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.weight)), 0);
}

/** Lowest score reachable on a test. */
export function minScore(test: ScorableTest): number {
  return test.questions.reduce((sum, q) => sum + Math.min(...q.options.map((o) => o.weight)), 0);
}

/** Weight of the chosen option, or null if the value is not an option of the question. */
function weightOf(question: Question, value: number | undefined): number | null {
  if (value === undefined) return null;
  return question.options.find((o) => o.value === value)?.weight ?? null;
}

/** Whether the chosen option of one question should show the support block. */
export function isAlertAnswer(question: Question, value: number | undefined): boolean {
  if (!question.sensitive || value === undefined) return false;
  return question.options.find((o) => o.value === value)?.alert === true;
}

/**
 * Scores a finished test. `answers[i]` is the chosen option `value` for `test.questions[i]`.
 * Throws when an answer is missing or invalid, so a tampered payload is never stored.
 */
export function scoreTest<T extends ScorableTest>(test: T, answers: readonly number[]): ScoreResult<T> {
  if (answers.length !== test.questions.length) {
    throw new Error("Answer count does not match question count");
  }

  let score = 0;
  let alert = false;
  test.questions.forEach((question, i) => {
    const weight = weightOf(question, answers[i]);
    if (weight === null) throw new Error(`Invalid answer for question ${i + 1}`);
    score += weight;
    if (isAlertAnswer(question, answers[i])) alert = true;
  });

  const threshold = test.thresholds.find((t) => score >= t.min && score <= t.max);
  if (!threshold) throw new Error(`No threshold covers score ${score}`);

  return { score, maxScore: maxScore(test), level: threshold.level, threshold, alert };
}

/**
 * Checks that thresholds are contiguous, non-overlapping and cover every reachable score.
 * Used by the admin form and by the content tests. Returns a list of problems (empty = ok).
 */
export function validateThresholds(test: ScorableTest): string[] {
  const problems: string[] = [];
  const sorted = [...test.thresholds].sort((a, b) => a.min - b.min);
  const lo = minScore(test);
  const hi = maxScore(test);

  if (sorted.length === 0) return ["No thresholds defined"];
  if (sorted[0].min > lo) problems.push(`Scores ${lo}..${sorted[0].min - 1} are not covered`);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].min - sorted[i - 1].max;
    if (gap > 1) problems.push(`Gap between ${sorted[i - 1].max} and ${sorted[i].min}`);
    if (gap < 1) problems.push(`Overlap between ${sorted[i - 1].max} and ${sorted[i].min}`);
  }
  const last = sorted[sorted.length - 1];
  if (last.max < hi) problems.push(`Scores ${last.max + 1}..${hi} are not covered`);
  return problems;
}
