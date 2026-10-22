import type { Locale } from "@/i18n/routing";

export type { Locale };

/** A string available in both site languages. */
export type L = Record<Locale, string>;
/** A list of strings available in both site languages. */
export type LList = Record<Locale, string[]>;

export type Level = "low" | "medium" | "high";
export const LEVELS: readonly Level[] = ["low", "medium", "high"];

export type ExerciseType = "breathing" | "grounding" | "diary" | "planner" | "pomodoro";
export const EXERCISE_TYPES: readonly ExerciseType[] = [
  "breathing",
  "grounding",
  "diary",
  "planner",
  "pomodoro",
];

export interface TopicContent {
  /** "Что это такое" */
  what: string;
  /** "Как проявляется" */
  signs: string[];
  /** "Почему возникает" */
  causes: string[];
  /** "Что можно сделать прямо сейчас" (5 tips) */
  tips: string[];
  /** "Когда обратиться к специалисту" */
  specialist: string;
}

export interface Topic {
  slug: string;
  /** lucide-react icon name, see components/ui/TopicIcon. */
  icon: string;
  sortOrder: number;
  title: L;
  description: L;
  content: Record<Locale, TopicContent>;
}

export interface Article {
  slug: string;
  topicSlug: string;
  title: L;
  excerpt: L;
  /** Markdown. */
  body: L;
  /** The "what to do today" block, 3 steps. */
  todaySteps: LList;
  tags: LList;
  /** Language-neutral reference list. */
  sources: string[];
  readingTime: number;
  publishedAt: string;
}

export interface TestOption {
  /** Stored in the user's answers; unique within the question. */
  value: number;
  /** Points added to the total score. */
  weight: number;
  label: L;
  /** On a sensitive question: choosing this option shows the support block. */
  alert?: boolean;
}

export interface TestQuestion {
  id: string;
  text: L;
  options: TestOption[];
  /** A "sensitive" question: an option marked `alert` triggers the support block. */
  sensitive?: boolean;
}

export interface TestThreshold {
  level: Level;
  /** Inclusive score range. */
  min: number;
  max: number;
  title: L;
  /** "What this means". */
  summary: L;
  /** Exactly 3 recommendations. */
  recommendations: LList;
  /** Exercise slugs worth trying at this level. */
  exerciseSlugs: string[];
  /** "When to turn to a specialist". */
  specialist: L;
}

export interface PsyTest {
  slug: string;
  topicSlug: string;
  title: L;
  description: L;
  durationMin: number;
  questions: TestQuestion[];
  thresholds: TestThreshold[];
}

export interface Exercise {
  slug: string;
  type: ExerciseType;
  title: L;
  description: L;
  /** Short how-to steps shown above the interactive part. */
  instructions: LList;
  durationMin: number;
  /** Type-specific settings, see components/exercises. */
  config: Record<string, unknown>;
  topicSlugs: string[];
  popular?: boolean;
}

export interface HelpContact {
  id: string;
  name: L;
  description: L;
  phone: string;
  hours: L;
  city: L;
  kind: "emergency" | "hotline" | "university";
  isActive: boolean;
  sortOrder: number;
  /** ISO date of the last manual check; null = never verified. */
  verifiedAt: string | null;
}

export type ContentKind = "topic" | "article" | "test" | "exercise";
