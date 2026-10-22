"use server";

import { z } from "zod";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { getTest } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { scoreTest } from "@/lib/tests/scoring";
import { CONSENT_VERSION } from "@/lib/constants";
import { pick } from "@/lib/utils";
import type { Locale } from "@/lib/content/types";
import {
  EMOTIONS,
  type DiaryDraft,
  type DiaryEntry,
  type LocalSnapshot,
  type TestRecord,
} from "./types";

/*
 * Server actions for the records that are encrypted at rest (diary, test answers) and for
 * account-level operations. Every action re-checks the session; row level security is the
 * second line of defence.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: "unauthenticated" | "invalid" | "not_found" | "unavailable" };

const fail = (error: Extract<ActionResult, { ok: false }>["error"]): ActionResult<never> => ({
  ok: false,
  error,
});

async function session() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, userId: data.user.id } : null;
}

function logFailure(scope: string, err: unknown) {
  // Log what failed, never what the person wrote.
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[actions] ${scope}: ${message}`);
}

// --- diary --------------------------------------------------------------------------------

const text = (max: number) => z.string().max(max).transform((s) => s.trim());

const diaryDraftSchema = z.object({
  emotion: z.enum(EMOTIONS),
  intensity: z.number().int().min(1).max(10),
  cause: text(2000),
  thought: text(2000),
  note: text(2000),
});

interface DiaryPayload {
  cause: string;
  thought: string;
  note: string;
}

export async function listDiaryAction(): Promise<ActionResult<DiaryEntry[]>> {
  const s = await session();
  if (!s) return fail("unauthenticated");
  const { data, error } = await s.supabase
    .from("emotion_diary")
    .select("id, emotion, intensity, payload_enc, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    logFailure("listDiary", error);
    return fail("unavailable");
  }

  const entries: DiaryEntry[] = [];
  for (const row of data ?? []) {
    try {
      const payload = decryptJson<DiaryPayload>(row.payload_enc, s.userId, "diary");
      entries.push({
        id: row.id,
        emotion: row.emotion,
        intensity: row.intensity,
        createdAt: row.created_at,
        ...payload,
      });
    } catch (err) {
      logFailure("listDiary/decrypt", err);
    }
  }
  return { ok: true, data: entries };
}

export async function saveDiaryAction(draft: DiaryDraft, id?: string): Promise<ActionResult<DiaryEntry>> {
  const s = await session();
  if (!s) return fail("unauthenticated");
  const parsed = diaryDraftSchema.safeParse(draft);
  if (!parsed.success) return fail("invalid");
  const { cause, thought, note, emotion, intensity } = parsed.data;

  try {
    const payload_enc = encryptJson({ cause, thought, note } satisfies DiaryPayload, s.userId, "diary");
    const query = id
      ? s.supabase.from("emotion_diary").update({ emotion, intensity, payload_enc }).eq("id", id)
      : s.supabase.from("emotion_diary").insert({ user_id: s.userId, emotion, intensity, payload_enc });
    const { data, error } = await query.select("id, created_at").single();
    if (error || !data) {
      if (error) logFailure("saveDiary", error);
      return fail(error?.code === "PGRST116" ? "not_found" : "unavailable");
    }
    return {
      ok: true,
      data: { id: data.id, createdAt: data.created_at, emotion, intensity, cause, thought, note },
    };
  } catch (err) {
    logFailure("saveDiary", err);
    return fail("unavailable");
  }
}

export async function deleteDiaryAction(id: string): Promise<ActionResult> {
  const s = await session();
  if (!s) return fail("unauthenticated");
  if (!z.uuid().safeParse(id).success) return fail("invalid");
  const { error } = await s.supabase.from("emotion_diary").delete().eq("id", id);
  if (error) {
    logFailure("deleteDiary", error);
    return fail("unavailable");
  }
  return { ok: true, data: undefined };
}

// --- tests --------------------------------------------------------------------------------

const answersSchema = z.array(z.number().int().min(0).max(20)).min(1).max(60);

/** Scores a test on the server from the raw answers (the client's score is never trusted) and stores it. */
export async function saveTestResultAction(
  testSlug: string,
  answers: number[],
  locale: Locale,
): Promise<ActionResult<TestRecord>> {
  const s = await session();
  if (!s) return fail("unauthenticated");
  const parsedAnswers = answersSchema.safeParse(answers);
  if (!parsedAnswers.success) return fail("invalid");

  const test = await getTest(testSlug);
  if (!test) return fail("not_found");

  let result;
  try {
    result = scoreTest(test, parsedAnswers.data);
  } catch {
    return fail("invalid");
  }

  const { data: testRow } = await s.supabase.from("tests").select("id").eq("slug", testSlug).maybeSingle();
  if (!testRow) return fail("unavailable");

  try {
    const { data, error } = await s.supabase
      .from("test_results")
      .insert({
        user_id: s.userId,
        test_id: testRow.id,
        score: result.score,
        max_score: result.maxScore,
        level: result.level,
        alert: result.alert,
        answers_enc: encryptJson(parsedAnswers.data, s.userId, "test-answers"),
      })
      .select("id, created_at")
      .single();
    if (error || !data) {
      if (error) logFailure("saveTestResult", error);
      return fail("unavailable");
    }
    return {
      ok: true,
      data: {
        id: data.id,
        testSlug,
        testTitle: pick(test.title, locale),
        score: result.score,
        maxScore: result.maxScore,
        level: result.level,
        alert: result.alert,
        createdAt: data.created_at,
      },
    };
  } catch (err) {
    logFailure("saveTestResult", err);
    return fail("unavailable");
  }
}

// --- import of a guest's local records ------------------------------------------------------

const importSchema = z.object({
  moods: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), mood: z.number().int().min(1).max(5) })).max(800),
  diary: z.array(diaryDraftSchema.extend({ createdAt: z.string().max(40) })).max(500),
  tests: z.array(z.object({ testSlug: z.string().max(80), answers: answersSchema, createdAt: z.string().max(40) })).max(200),
  favorites: z.array(z.object({ type: z.enum(["article", "exercise", "topic", "test"]), slug: z.string().max(120) })).max(300),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        quadrant: z.number().int().min(1).max(4),
        done: z.boolean(),
        order: z.number().int(),
      }),
    )
    .max(300),
});

export async function importLocalDataAction(snapshot: LocalSnapshot): Promise<ActionResult<{ imported: number }>> {
  const s = await session();
  if (!s) return fail("unauthenticated");
  const parsed = importSchema.safeParse(snapshot);
  if (!parsed.success) return fail("invalid");
  const data = parsed.data;
  const userId = s.userId;
  let imported = 0;

  try {
    if (data.moods.length) {
      const { error } = await s.supabase.from("mood_entries").upsert(
        data.moods.map((m) => ({ user_id: userId, mood: m.mood, entry_date: m.date })),
        { onConflict: "user_id,entry_date", ignoreDuplicates: true },
      );
      if (error) throw error;
      imported += data.moods.length;
    }

    if (data.diary.length) {
      const { error } = await s.supabase.from("emotion_diary").insert(
        data.diary.map((d) => ({
          user_id: userId,
          emotion: d.emotion,
          intensity: d.intensity,
          payload_enc: encryptJson({ cause: d.cause, thought: d.thought, note: d.note }, userId, "diary"),
          created_at: new Date(d.createdAt).toISOString(),
        })),
      );
      if (error) throw error;
      imported += data.diary.length;
    }

    const testRows = [];
    for (const t of data.tests) {
      const test = await getTest(t.testSlug);
      if (!test) continue;
      let result;
      try {
        result = scoreTest(test, t.answers);
      } catch {
        continue;
      }
      const { data: row } = await s.supabase.from("tests").select("id").eq("slug", t.testSlug).maybeSingle();
      if (!row) continue;
      testRows.push({
        user_id: userId,
        test_id: row.id,
        score: result.score,
        max_score: result.maxScore,
        level: result.level,
        alert: result.alert,
        answers_enc: encryptJson(t.answers, userId, "test-answers"),
        created_at: new Date(t.createdAt).toISOString(),
      });
    }
    if (testRows.length) {
      const { error } = await s.supabase.from("test_results").insert(testRows);
      if (error) throw error;
      imported += testRows.length;
    }

    if (data.favorites.length) {
      const { error } = await s.supabase.from("favorites").upsert(
        data.favorites.map((f) => ({ user_id: userId, item_type: f.type, item_slug: f.slug })),
        { onConflict: "user_id,item_type,item_slug", ignoreDuplicates: true },
      );
      if (error) throw error;
      imported += data.favorites.length;
    }

    if (data.tasks.length) {
      const { error } = await s.supabase.from("planner_tasks").insert(
        data.tasks.map((t) => ({
          user_id: userId,
          title: t.title,
          quadrant: t.quadrant,
          done: t.done,
          sort_order: t.order,
        })),
      );
      if (error) throw error;
      imported += data.tasks.length;
    }
  } catch (err) {
    logFailure("importLocalData", err);
    return fail("unavailable");
  }
  return { ok: true, data: { imported } };
}

// --- account --------------------------------------------------------------------------------

/** Stores the consent of a user who signed in with Google (email sign-ups consent in the form). */
export async function recordConsentAction(): Promise<ActionResult> {
  const s = await session();
  if (!s) return fail("unauthenticated");
  const { error } = await s.supabase.rpc("record_consent", { p_version: CONSENT_VERSION });
  if (error) {
    logFailure("recordConsent", error);
    return fail("unavailable");
  }
  return { ok: true, data: undefined };
}

/** Permanently deletes the account and every personal record (cascade), then ends the session. */
export async function deleteAccountAction(): Promise<ActionResult> {
  const s = await session();
  if (!s) return fail("unauthenticated");
  const { error } = await s.supabase.rpc("delete_my_account");
  if (error) {
    logFailure("deleteAccount", error);
    return fail("unavailable");
  }
  await s.supabase.auth.signOut();
  return { ok: true, data: undefined };
}
