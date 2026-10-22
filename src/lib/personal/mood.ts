import { lastDays } from "@/lib/utils";
import type { Mood, MoodEntry } from "./types";

export interface MoodPoint {
  /** YYYY-MM-DD */
  date: string;
  /** null = no entry that day (a gap in the line) */
  mood: Mood | null;
}

/** One point per calendar day for the last `days` days, with gaps where nothing was recorded. */
export function buildMoodSeries(entries: MoodEntry[], days = 30, now: Date = new Date()): MoodPoint[] {
  const byDate = new Map(entries.map((e) => [e.date, e.mood]));
  return lastDays(days, now).map((date) => ({ date, mood: byDate.get(date) ?? null }));
}

/** Average mood over the recorded days, rounded to one decimal; null if nothing was recorded. */
export function averageMood(series: MoodPoint[]): number | null {
  const values = series.flatMap((p) => (p.mood === null ? [] : [p.mood]));
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
