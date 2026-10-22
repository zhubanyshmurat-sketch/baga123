import type { Level } from "@/lib/content/types";
import type { ScorableTest } from "@/lib/tests/scoring";

export type Mood = 1 | 2 | 3 | 4 | 5;
export const MOODS: readonly Mood[] = [1, 2, 3, 4, 5];

export const EMOTIONS = [
  "joy",
  "calm",
  "gratitude",
  "interest",
  "sadness",
  "anxiety",
  "anger",
  "shame",
  "fatigue",
  "loneliness",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export interface MoodEntry {
  /** YYYY-MM-DD in Asia/Almaty. */
  date: string;
  mood: Mood;
}

export interface DiaryDraft {
  emotion: Emotion;
  /** 1–10 */
  intensity: number;
  cause: string;
  thought: string;
  note: string;
}

export interface DiaryEntry extends DiaryDraft {
  id: string;
  createdAt: string;
}

export interface TestRecord {
  id: string;
  testSlug: string;
  testTitle: string;
  score: number;
  maxScore: number;
  level: Level;
  alert: boolean;
  createdAt: string;
}

export type FavoriteType = "article" | "exercise" | "topic" | "test";
export interface Favorite {
  type: FavoriteType;
  slug: string;
}

export type Quadrant = 1 | 2 | 3 | 4;
export interface PlannerTask {
  id: string;
  title: string;
  quadrant: Quadrant;
  done: boolean;
  order: number;
}

/** The test as the browser knows it: enough to score locally and to label the record. */
export interface TestForSaving extends ScorableTest {
  slug: string;
  title: string;
}

/**
 * Everything a person can keep. A guest's records live in this browser (LocalStore); a signed-in
 * student's live in the database (RemoteStore). Components only know this interface.
 */
export interface PersonalStore {
  readonly kind: "local" | "remote";

  /** Mood entries of the last `days` days. */
  getMoods(days: number): Promise<MoodEntry[]>;
  setMood(date: string, mood: Mood): Promise<void>;

  listDiary(): Promise<DiaryEntry[]>;
  saveDiary(draft: DiaryDraft, id?: string): Promise<DiaryEntry>;
  deleteDiary(id: string): Promise<void>;

  listTests(): Promise<TestRecord[]>;
  /** Scores and stores a finished test. `answers[i]` is the chosen option value of question i. */
  saveTest(test: TestForSaving, answers: number[]): Promise<TestRecord>;

  listFavorites(): Promise<Favorite[]>;
  setFavorite(type: FavoriteType, slug: string, on: boolean): Promise<void>;

  listTasks(): Promise<PlannerTask[]>;
  /** Replaces the whole task list (drag and drop reorders many tasks at once). */
  saveTasks(tasks: PlannerTask[]): Promise<void>;

  logExercise(slug: string, durationSec: number): Promise<void>;
  /** Days (YYYY-MM-DD) on which anything was practised; feeds the streak. */
  practiceDays(): Promise<string[]>;
}

/** What a guest has stored on this device, offered for import after signing in. */
export interface LocalSnapshot {
  moods: MoodEntry[];
  diary: DiaryEntry[];
  tests: (TestRecord & { answers: number[] })[];
  favorites: Favorite[];
  tasks: PlannerTask[];
}
