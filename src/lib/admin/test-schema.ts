import { z } from "zod";
import { LEVELS } from "@/lib/content/types";
import { maxScore, minScore, validateThresholds, type ScorableTest } from "@/lib/tests/scoring";

const short = (max: number) => z.string().trim().min(1).max(max);

export const optionSchema = z.object({
  weight: z.number().int().min(0).max(20),
  label_kk: short(160),
  label_ru: short(160),
  alert: z.boolean().optional(),
});

export const questionSchema = z.object({
  text_kk: short(600),
  text_ru: short(600),
  sensitive: z.boolean(),
  options: z.array(optionSchema).min(2).max(10),
});

export const thresholdSchema = z.object({
  level: z.enum(LEVELS as unknown as [string, ...string[]]),
  min: z.number().int().min(0).max(500),
  max: z.number().int().min(0).max(500),
  title_kk: short(200),
  title_ru: short(200),
  summary_kk: short(1500),
  summary_ru: short(1500),
  recommendations_kk: z.array(short(500)),
  recommendations_ru: z.array(short(500)),
  exercise_slugs: z.array(short(80)).max(10),
  specialist_kk: short(1000),
  specialist_ru: short(1000),
});

export const testPayloadSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  topic_id: z.string().regex(/^[0-9a-f-]{36}$/i).nullable(),
  title_kk: short(200),
  title_ru: short(200),
  description_kk: z.string().trim().max(1000),
  description_ru: z.string().trim().max(1000),
  duration_min: z.number().int().min(1).max(30),
  status: z.enum(["draft", "published"]),
  thresholds: z.array(thresholdSchema).min(1).max(6),
  questions: z.array(questionSchema).min(1).max(60),
});

export type TestPayload = z.infer<typeof testPayloadSchema>;
export type QuestionPayload = z.infer<typeof questionSchema>;
export type ThresholdPayload = z.infer<typeof thresholdSchema>;

export type TestProblem =
  | "schema"
  | "needQuestions"
  | "needThresholds"
  | "needOptions"
  | "needAlert"
  | "needReco"
  | "thresholds";

/** The scoring view of a payload: option values are their positions, as stored in the database. */
export function toScorable(payload: TestPayload): ScorableTest {
  return {
    questions: payload.questions.map((q) => ({
      sensitive: q.sensitive,
      options: q.options.map((o, value) => ({ value, weight: o.weight, alert: o.alert })),
    })),
    thresholds: payload.thresholds.map((t) => ({ level: t.level as ScorableTest["thresholds"][number]["level"], min: t.min, max: t.max })),
  };
}

/**
 * Domain checks on top of the schema: enough options, an alarming option on every sensitive
 * question, three recommendations per level and language, and thresholds that cover every score a
 * person can reach. Shared by the editor (live feedback) and the server action (final say).
 */
export function checkTestPayload(payload: TestPayload): { problems: TestProblem[]; details: string[]; min: number; max: number } {
  const problems = new Set<TestProblem>();
  const details: string[] = [];

  if (payload.questions.length === 0) problems.add("needQuestions");
  if (payload.thresholds.length === 0) problems.add("needThresholds");
  for (const q of payload.questions) {
    if (q.options.length < 2) problems.add("needOptions");
    if (q.sensitive && !q.options.some((o) => o.alert)) problems.add("needAlert");
  }
  for (const t of payload.thresholds) {
    if (t.recommendations_kk.length !== 3 || t.recommendations_ru.length !== 3) problems.add("needReco");
  }
  const scorable = toScorable(payload);
  let min = 0;
  let max = 0;
  if (payload.questions.length > 0 && payload.questions.every((q) => q.options.length > 0)) {
    min = minScore(scorable);
    max = maxScore(scorable);
    const coverage = validateThresholds(scorable);
    if (coverage.length > 0) {
      problems.add("thresholds");
      details.push(...coverage);
    }
  }
  return { problems: [...problems], details, min, max };
}
