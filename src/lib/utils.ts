import clsx, { type ClassValue } from "clsx";
import type { L, Locale } from "@/lib/content/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Picks the string for a locale from a bilingual pair. */
export function pick(value: L, locale: Locale): string {
  return value[locale] ?? value.kk ?? value.ru ?? "";
}

export function isLocale(value: string): value is Locale {
  return value === "kk" || value === "ru";
}

/** Today's date (YYYY-MM-DD) in Kazakhstan time, which is where the audience lives. */
export function todayKey(now: Date = new Date()): string {
  return dateKey(now);
}

/** YYYY-MM-DD for a date in Asia/Almaty. */
export function dateKey(date: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The `n` most recent calendar days ending today, oldest first, as YYYY-MM-DD keys. */
export function lastDays(n: number, now: Date = new Date()): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(dateKey(new Date(now.getTime() - i * 86_400_000)));
  }
  return days;
}

/** Number of consecutive practice days ending today (or yesterday, so the streak survives until midnight). */
export function computeStreak(days: Iterable<string>, now: Date = new Date()): number {
  const set = new Set(days);
  let cursor = new Date(now.getTime());
  if (!set.has(dateKey(cursor))) {
    cursor = new Date(cursor.getTime() - 86_400_000);
    if (!set.has(dateKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(dateKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}

/** Normalises text for search: lower case, ё→е, strips combining marks. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Epoch milliseconds for "n days ago". Lives here so render code never calls Date.now() directly. */
export function daysAgoMs(days: number): number {
  return Date.now() - days * 86_400_000;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
