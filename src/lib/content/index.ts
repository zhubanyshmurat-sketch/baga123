import "server-only";
import { cache } from "react";
import * as bundled from "@/content";
import { createPublicClient } from "@/lib/supabase/public";
import {
  articleFromRow,
  contactFromRow,
  exerciseFromRow,
  testFromRow,
  topicFromRow,
} from "./db";
import type { Article, Exercise, HelpContact, PsyTest, Topic } from "./types";

/*
 * Content loaders. With a Supabase project configured, content comes from the database
 * (cached by Next.js and purged by revalidateTag on every admin edit). Without one, or if the
 * database is unreachable or has not been seeded yet, the bundled demo content is used, so the
 * site always renders.
 */

type Db = NonNullable<ReturnType<typeof createPublicClient>>;
type DbResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;

async function fromDb<T>(label: string, run: (db: Db) => DbResult): Promise<T[] | null> {
  const db = createPublicClient();
  if (!db) return null;
  try {
    const { data, error } = await run(db);
    if (error) {
      console.error(`[content] ${label}: ${error.message}`);
      return null;
    }
    return (data ?? []) as T[];
  } catch (err) {
    console.error(`[content] ${label} failed`, err);
    return null;
  }
}

const articleColumns =
  "slug, title_kk, title_ru, excerpt_kk, excerpt_ru, today_steps_kk, today_steps_ru, " +
  "tags_kk, tags_ru, sources, reading_time, published_at, topics(slug)";

export const getTopics = cache(async (): Promise<Topic[]> => {
  const rows = await fromDb<Record<string, unknown>>("topics", (db) =>
    db.from("topics").select("*").order("sort_order"),
  );
  if (rows && rows.length > 0) return rows.map(topicFromRow);
  return [...bundled.topics].sort((a, b) => a.sortOrder - b.sortOrder);
});

export const getTopic = cache(async (slug: string): Promise<Topic | undefined> => {
  return (await getTopics()).find((t) => t.slug === slug);
});

/** All published articles, newest first. Bodies are included only when `withBody` is true. */
export const getArticles = cache(async (withBody = false): Promise<Article[]> => {
  const columns = withBody ? `${articleColumns}, body_kk, body_ru` : articleColumns;
  const rows = await fromDb<Record<string, unknown>>("articles", (db) =>
    db
      .from("articles")
      .select(columns)
      .eq("status", "published")
      .order("published_at", { ascending: false }),
  );
  const list =
    rows && rows.length > 0
      ? rows.map(articleFromRow)
      : bundled.articles.map((a) => (withBody ? a : { ...a, body: { kk: "", ru: "" } }));
  return [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
});

export const getArticle = cache(async (slug: string): Promise<Article | undefined> => {
  const rows = await fromDb<Record<string, unknown>>("article", (db) =>
    db
      .from("articles")
      .select(`${articleColumns}, body_kk, body_ru`)
      .eq("status", "published")
      .eq("slug", slug)
      .limit(1),
  );
  if (rows && rows.length > 0) return articleFromRow(rows[0]);
  return bundled.articles.find((a) => a.slug === slug);
});

export const getTests = cache(async (): Promise<PsyTest[]> => {
  const rows = await fromDb<Record<string, unknown>>("tests", (db) =>
    db
      .from("tests")
      .select("*, topics(slug), test_questions(*)")
      .eq("status", "published")
      .order("created_at"),
  );
  if (rows && rows.length > 0) {
    const order = new Map(bundled.topics.map((t) => [t.slug, t.sortOrder]));
    return rows
      .map(testFromRow)
      .sort((a, b) => (order.get(a.topicSlug) ?? 99) - (order.get(b.topicSlug) ?? 99));
  }
  return bundled.tests;
});

export const getTest = cache(async (slug: string): Promise<PsyTest | undefined> => {
  return (await getTests()).find((t) => t.slug === slug);
});

export const getExercises = cache(async (): Promise<Exercise[]> => {
  const rows = await fromDb<Record<string, unknown>>("exercises", (db) =>
    db
      .from("exercises")
      .select("*, exercise_topics(topics(slug))")
      .eq("status", "published")
      .order("created_at"),
  );
  if (rows && rows.length > 0) return rows.map(exerciseFromRow);
  return bundled.exercises;
});

export const getExercise = cache(async (slug: string): Promise<Exercise | undefined> => {
  return (await getExercises()).find((e) => e.slug === slug);
});

/**
 * Active help contacts. If the database is unreachable or has no active contact, the bundled
 * emergency numbers are shown, so the site is never without a way to get help.
 */
export const getHelpContacts = cache(async (): Promise<HelpContact[]> => {
  const rows = await fromDb<Record<string, unknown>>("help_contacts", (db) =>
    db.from("help_contacts").select("*").eq("is_active", true).order("sort_order"),
  );
  if (rows && rows.length > 0) return rows.map(contactFromRow);
  return bundled.helpContacts;
});

export interface TopicBundle {
  topic: Topic;
  test?: PsyTest;
  tests: PsyTest[];
  exercises: Exercise[];
  articles: Article[];
}

export const getTopicBundle = cache(async (slug: string): Promise<TopicBundle | undefined> => {
  const topic = await getTopic(slug);
  if (!topic) return undefined;
  const [tests, exercises, articles] = await Promise.all([getTests(), getExercises(), getArticles()]);
  const topicTests = tests.filter((t) => t.topicSlug === slug);
  return {
    topic,
    test: topicTests[0],
    tests: topicTests,
    exercises: exercises.filter((e) => e.topicSlugs.includes(slug)),
    articles: articles.filter((a) => a.topicSlug === slug),
  };
});
