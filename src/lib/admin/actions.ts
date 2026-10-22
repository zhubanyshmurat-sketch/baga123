"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getAdminAccess, type Role } from "@/lib/admin/auth";
import { buildRow, isResourceKey, resources } from "@/lib/admin/resources";
import { checkTestPayload, testPayloadSchema } from "@/lib/admin/test-schema";
import { CONTENT_TAG } from "@/lib/supabase/public";

/*
 * Server actions behind the admin panel. Each one re-reads the caller's role from the database;
 * the forms are only a convenience. RLS policies enforce the same rules a second time.
 */

export type SaveState = {
  ok: boolean;
  error?: "forbidden" | "invalid" | "slugTaken" | "generic";
  /** Names of the fields that failed validation. */
  fields?: string[];
};

/** Marks cached public content stale so visitors see the edit on their next request. */
function publish() {
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

const isUniqueViolation = (error: { code?: string } | null) => error?.code === "23505";

export async function saveResourceAction(
  resourceKey: string,
  id: string,
  _previous: SaveState,
  form: FormData,
): Promise<SaveState> {
  if (!isResourceKey(resourceKey)) return { ok: false, error: "invalid" };
  const resource = resources[resourceKey];
  const access = await getAdminAccess(resource.role);
  if (access.status !== "ok") return { ok: false, error: "forbidden" };
  const { supabase } = access.session;

  const built = buildRow(resource, form);
  if (!built.ok) return { ok: false, error: "invalid", fields: built.errors };
  const row = { ...built.row };

  // Publishing an article for the first time stamps its publication date.
  if (resourceKey === "articles" && row.status === "published") {
    let publishedAt: string | null = null;
    if (id) {
      const { data } = await supabase.from("articles").select("published_at").eq("id", id).maybeSingle();
      publishedAt = data?.published_at ?? null;
    }
    row.published_at = publishedAt ?? new Date().toISOString();
  }

  const query = id
    ? supabase.from(resource.table).update(row).eq("id", id)
    : supabase.from(resource.table).insert(row);
  const { data, error } = await query.select("id").single();
  if (error || !data) {
    if (error) console.error(`[admin] save ${resourceKey}: ${error.message}`);
    return { ok: false, error: isUniqueViolation(error) ? "slugTaken" : "generic" };
  }

  if (resource.links) {
    const { table, ownKey, otherKey } = resource.links;
    const { error: delError } = await supabase.from(table).delete().eq(ownKey, data.id);
    if (delError) return { ok: false, error: "generic" };
    if (built.links.length > 0) {
      const { error: insError } = await supabase
        .from(table)
        .insert(built.links.map((other) => ({ [ownKey]: data.id, [otherKey]: other })));
      if (insError) return { ok: false, error: "generic" };
    }
  }

  publish();
  redirect({ href: `/admin/${resourceKey}`, locale: await getLocale() });
  return { ok: true };
}

export async function deleteResourceAction(resourceKey: string, id: string): Promise<SaveState> {
  if (!isResourceKey(resourceKey) && resourceKey !== "tests") return { ok: false, error: "invalid" };
  const role: Exclude<Role, "student"> = resourceKey === "contacts" ? "admin" : "editor";
  const access = await getAdminAccess(role);
  if (access.status !== "ok") return { ok: false, error: "forbidden" };
  const table = resourceKey === "tests" ? "tests" : resources[resourceKey].table;
  const { error } = await access.session.supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`[admin] delete ${resourceKey}: ${error.message}`);
    return { ok: false, error: "generic" };
  }
  publish();
  return { ok: true };
}

/** Stores the result of a manual check of a help contact (admin only). */
export async function verifyContactAction(id: string): Promise<SaveState> {
  const access = await getAdminAccess("admin");
  if (access.status !== "ok") return { ok: false, error: "forbidden" };
  const { error } = await access.session.supabase
    .from("help_contacts")
    .update({ verified_at: new Date().toISOString(), verified_by: access.session.userId })
    .eq("id", id);
  if (error) return { ok: false, error: "generic" };
  publish();
  return { ok: true };
}

export async function setUserRoleAction(userId: string, role: string): Promise<SaveState> {
  if (role !== "student" && role !== "editor" && role !== "admin") return { ok: false, error: "invalid" };
  const access = await getAdminAccess("admin");
  if (access.status !== "ok") return { ok: false, error: "forbidden" };
  const { error } = await access.session.supabase.rpc("set_user_role", { target: userId, new_role: role });
  if (error) {
    console.error(`[admin] set role: ${error.message}`);
    return { ok: false, error: "forbidden" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Saves a test with its questions and result levels. `payload` is the editor's JSON state. */
export async function saveTestAction(id: string, payload: string): Promise<SaveState> {
  const access = await getAdminAccess("editor");
  if (access.status !== "ok") return { ok: false, error: "forbidden" };
  const { supabase } = access.session;

  let parsed;
  try {
    parsed = testPayloadSchema.safeParse(JSON.parse(payload));
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (!parsed.success) return { ok: false, error: "invalid" };
  const test = parsed.data;
  if (checkTestPayload(test).problems.length > 0) return { ok: false, error: "invalid" };

  const row = {
    slug: test.slug,
    topic_id: test.topic_id,
    title_kk: test.title_kk,
    title_ru: test.title_ru,
    description_kk: test.description_kk,
    description_ru: test.description_ru,
    duration_min: test.duration_min,
    status: test.status,
    thresholds: test.thresholds,
  };
  const query = id ? supabase.from("tests").update(row).eq("id", id) : supabase.from("tests").insert(row);
  const { data, error } = await query.select("id").single();
  if (error || !data) {
    if (error) console.error(`[admin] save test: ${error.message}`);
    return { ok: false, error: isUniqueViolation(error) ? "slugTaken" : "generic" };
  }

  const questions = test.questions.map((q) => ({
    text_kk: q.text_kk,
    text_ru: q.text_ru,
    is_sensitive: q.sensitive,
    options: q.options.map((o, value) => ({
      value,
      weight: o.weight,
      label_kk: o.label_kk,
      label_ru: o.label_ru,
      ...(o.alert ? { alert: true } : {}),
    })),
  }));
  const { error: qError } = await supabase.rpc("replace_test_questions", {
    p_test_id: data.id,
    p_questions: questions,
  });
  if (qError) {
    console.error(`[admin] replace questions: ${qError.message}`);
    return { ok: false, error: "generic" };
  }

  publish();
  redirect({ href: "/admin/tests", locale: await getLocale() });
  return { ok: true };
}
