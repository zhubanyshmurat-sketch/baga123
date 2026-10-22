import { dateKey, lastDays, newId } from "@/lib/utils";
import { scoreTest } from "@/lib/tests/scoring";
import type {
  DiaryDraft,
  DiaryEntry,
  Favorite,
  FavoriteType,
  LocalSnapshot,
  Mood,
  MoodEntry,
  PersonalStore,
  PlannerTask,
  TestForSaving,
  TestRecord,
} from "./types";

const KEYS = {
  moods: "sm.moods",
  diary: "sm.diary",
  tests: "sm.tests",
  favorites: "sm.favorites",
  tasks: "sm.tasks",
  sessions: "sm.sessions",
} as const;

/** In-memory fallback for browsers where storage is blocked (private mode, strict settings). */
const memory = new Map<string, string>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key) ?? memory.get(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    const raw = memory.get(key);
    try {
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
}

function write(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(key, raw);
    memory.delete(key);
  } catch {
    memory.set(key, raw);
  }
}

type StoredTest = TestRecord & { answers: number[] };
interface Session {
  date: string;
  slug: string;
  sec: number;
}

const MAX_TESTS = 200;
const MAX_DIARY = 500;

export function createLocalStore(): PersonalStore {
  return {
    kind: "local",

    async getMoods(days) {
      const moods = read<Record<string, Mood>>(KEYS.moods, {});
      const keep = new Set(lastDays(days));
      return Object.entries(moods)
        .filter(([date]) => keep.has(date))
        .map(([date, mood]): MoodEntry => ({ date, mood }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },

    async setMood(date, mood) {
      const moods = read<Record<string, Mood>>(KEYS.moods, {});
      moods[date] = mood;
      write(KEYS.moods, moods);
    },

    async listDiary() {
      return read<DiaryEntry[]>(KEYS.diary, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async saveDiary(draft: DiaryDraft, id) {
      const entries = read<DiaryEntry[]>(KEYS.diary, []);
      const existing = id ? entries.find((e) => e.id === id) : undefined;
      const entry: DiaryEntry = {
        ...draft,
        id: existing?.id ?? newId(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      const next = existing ? entries.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...entries];
      write(KEYS.diary, next.slice(0, MAX_DIARY));
      return entry;
    },

    async deleteDiary(id) {
      write(
        KEYS.diary,
        read<DiaryEntry[]>(KEYS.diary, []).filter((e) => e.id !== id),
      );
    },

    async listTests() {
      return read<StoredTest[]>(KEYS.tests, [])
        .map(({ answers: _answers, ...record }) => {
          void _answers;
          return record;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async saveTest(test: TestForSaving, answers) {
      const result = scoreTest(test, answers);
      const record: StoredTest = {
        id: newId(),
        testSlug: test.slug,
        testTitle: test.title,
        score: result.score,
        maxScore: result.maxScore,
        level: result.level,
        alert: result.alert,
        createdAt: new Date().toISOString(),
        answers,
      };
      write(KEYS.tests, [record, ...read<StoredTest[]>(KEYS.tests, [])].slice(0, MAX_TESTS));
      const { answers: _a, ...plain } = record;
      void _a;
      return plain;
    },

    async listFavorites() {
      return read<Favorite[]>(KEYS.favorites, []);
    },

    async setFavorite(type: FavoriteType, slug, on) {
      const rest = read<Favorite[]>(KEYS.favorites, []).filter((f) => !(f.type === type && f.slug === slug));
      write(KEYS.favorites, on ? [...rest, { type, slug }] : rest);
    },

    async listTasks() {
      return read<PlannerTask[]>(KEYS.tasks, []);
    },

    async saveTasks(tasks) {
      write(KEYS.tasks, tasks);
    },

    async logExercise(slug, durationSec) {
      const sessions = read<Session[]>(KEYS.sessions, []);
      sessions.push({ date: dateKey(new Date()), slug, sec: Math.round(durationSec) });
      write(KEYS.sessions, sessions.slice(-1000));
    },

    async practiceDays() {
      const days = new Set<string>();
      for (const date of Object.keys(read<Record<string, Mood>>(KEYS.moods, {}))) days.add(date);
      for (const e of read<DiaryEntry[]>(KEYS.diary, [])) days.add(dateKey(new Date(e.createdAt)));
      for (const t of read<StoredTest[]>(KEYS.tests, [])) days.add(dateKey(new Date(t.createdAt)));
      for (const s of read<Session[]>(KEYS.sessions, [])) days.add(s.date);
      return [...days];
    },
  };
}

/** Everything stored on this device, for the "move to my account" offer. */
export function readLocalSnapshot(): LocalSnapshot {
  const moods = read<Record<string, Mood>>(KEYS.moods, {});
  return {
    moods: Object.entries(moods).map(([date, mood]) => ({ date, mood })),
    diary: read<DiaryEntry[]>(KEYS.diary, []),
    tests: read<StoredTest[]>(KEYS.tests, []),
    favorites: read<Favorite[]>(KEYS.favorites, []),
    tasks: read<PlannerTask[]>(KEYS.tasks, []),
  };
}

export function hasLocalData(snapshot = readLocalSnapshot()): boolean {
  return (
    snapshot.moods.length +
      snapshot.diary.length +
      snapshot.tests.length +
      snapshot.favorites.length +
      snapshot.tasks.length >
    0
  );
}

/** Removes the records of this device (after they were imported, or when the person asks). */
export function clearLocalData() {
  for (const key of [KEYS.moods, KEYS.diary, KEYS.tests, KEYS.favorites, KEYS.tasks]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    memory.delete(key);
  }
}

