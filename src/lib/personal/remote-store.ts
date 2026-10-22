import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/content/types";
import { lastDays } from "@/lib/utils";
import {
  deleteDiaryAction,
  listDiaryAction,
  saveDiaryAction,
  saveTestResultAction,
  type ActionResult,
} from "./actions";
import type {
  FavoriteType,
  Mood,
  PersonalStore,
  PlannerTask,
  Quadrant,
  TestRecord,
} from "./types";

class StoreError extends Error {
  constructor(scope: string, detail?: string) {
    super(detail ? `${scope}: ${detail}` : scope);
    this.name = "StoreError";
  }
}

function unwrap<T>(scope: string, result: ActionResult<T>): T {
  if (!result.ok) throw new StoreError(scope, result.error);
  return result.data;
}

function check(scope: string, error: { message: string } | null) {
  if (error) throw new StoreError(scope, error.message);
}

/** Store for a signed-in student: plain tables go through RLS, encrypted ones through server actions. */
export function createRemoteStore(
  supabase: SupabaseClient,
  userId: string,
  locale: Locale,
): PersonalStore {
  return {
    kind: "remote",

    async getMoods(days) {
      const since = lastDays(days)[0];
      const { data, error } = await supabase
        .from("mood_entries")
        .select("entry_date, mood")
        .gte("entry_date", since)
        .order("entry_date");
      check("getMoods", error);
      return (data ?? []).map((r) => ({ date: r.entry_date as string, mood: r.mood as Mood }));
    },

    async setMood(date, mood) {
      const { error } = await supabase
        .from("mood_entries")
        .upsert({ user_id: userId, entry_date: date, mood }, { onConflict: "user_id,entry_date" });
      check("setMood", error);
    },

    async listDiary() {
      return unwrap("listDiary", await listDiaryAction());
    },

    async saveDiary(draft, id) {
      return unwrap("saveDiary", await saveDiaryAction(draft, id));
    },

    async deleteDiary(id) {
      unwrap("deleteDiary", await deleteDiaryAction(id));
    },

    async listTests() {
      const { data, error } = await supabase
        .from("test_results")
        .select("id, score, max_score, level, alert, created_at, tests(slug, title_kk, title_ru)")
        .order("created_at", { ascending: false })
        .limit(200);
      check("listTests", error);
      return (data ?? []).map((r): TestRecord => {
        const test = (Array.isArray(r.tests) ? r.tests[0] : r.tests) as
          | { slug: string; title_kk: string; title_ru: string }
          | null;
        return {
          id: r.id,
          testSlug: test?.slug ?? "",
          testTitle: (locale === "kk" ? test?.title_kk : test?.title_ru) ?? "",
          score: r.score,
          maxScore: r.max_score,
          level: r.level,
          alert: r.alert,
          createdAt: r.created_at,
        };
      });
    },

    async saveTest(test, answers) {
      return unwrap("saveTest", await saveTestResultAction(test.slug, answers, locale));
    },

    async listFavorites() {
      const { data, error } = await supabase.from("favorites").select("item_type, item_slug");
      check("listFavorites", error);
      return (data ?? []).map((r) => ({ type: r.item_type as FavoriteType, slug: r.item_slug as string }));
    },

    async setFavorite(type, slug, on) {
      const { error } = on
        ? await supabase
            .from("favorites")
            .upsert({ user_id: userId, item_type: type, item_slug: slug }, { onConflict: "user_id,item_type,item_slug" })
        : await supabase.from("favorites").delete().match({ item_type: type, item_slug: slug });
      check("setFavorite", error);
    },

    async listTasks() {
      const { data, error } = await supabase
        .from("planner_tasks")
        .select("id, title, quadrant, done, sort_order")
        .order("quadrant")
        .order("sort_order");
      check("listTasks", error);
      return (data ?? []).map(
        (r): PlannerTask => ({
          id: r.id,
          title: r.title,
          quadrant: r.quadrant as Quadrant,
          done: r.done,
          order: r.sort_order,
        }),
      );
    },

    async saveTasks(tasks) {
      // Ids created in the browser are UUIDs, so the whole list can be upserted and the
      // rows that disappeared from it removed.
      const keep = tasks.map((t) => t.id);
      if (keep.length > 0) {
        const { error } = await supabase.from("planner_tasks").upsert(
          tasks.map((t) => ({
            id: t.id,
            user_id: userId,
            title: t.title,
            quadrant: t.quadrant,
            done: t.done,
            sort_order: t.order,
          })),
          { onConflict: "id" },
        );
        check("saveTasks", error);
        const { error: delError } = await supabase
          .from("planner_tasks")
          .delete()
          .not("id", "in", `(${keep.join(",")})`);
        check("saveTasks/prune", delError);
      } else {
        const { error } = await supabase.from("planner_tasks").delete().eq("user_id", userId);
        check("saveTasks/clear", error);
      }
    },

    async logExercise(slug, durationSec) {
      const { error } = await supabase
        .from("exercise_sessions")
        .insert({ user_id: userId, exercise_slug: slug, duration_sec: Math.min(Math.round(durationSec), 86_400) });
      check("logExercise", error);
    },

    async practiceDays() {
      const { data, error } = await supabase.rpc("practice_days");
      check("practiceDays", error);
      return ((data ?? []) as { day: string }[]).map((r) => r.day);
    },
  };
}
