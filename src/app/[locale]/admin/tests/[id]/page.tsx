import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { TopicOption } from "@/components/admin/ResourceForm";
import { TestEditor, newTestState, type EditorState } from "@/components/admin/TestEditor";
import type { Locale } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function toEditorState(test: Row, questions: Row[]): EditorState {
  return {
    slug: test.slug,
    topic_id: test.topic_id ?? "",
    title_kk: test.title_kk,
    title_ru: test.title_ru,
    description_kk: test.description_kk ?? "",
    description_ru: test.description_ru ?? "",
    duration_min: test.duration_min,
    status: test.status,
    questions: questions.map((q) => ({
      text_kk: q.text_kk,
      text_ru: q.text_ru,
      sensitive: q.is_sensitive,
      options: (q.options as Row[]).map((o) => ({
        weight: o.weight,
        label_kk: o.label_kk,
        label_ru: o.label_ru,
        alert: o.alert === true,
      })),
    })),
    thresholds: ((test.thresholds ?? []) as Row[]).map((t) => ({
      level: t.level,
      min: t.min,
      max: t.max,
      title_kk: t.title_kk ?? "",
      title_ru: t.title_ru ?? "",
      summary_kk: t.summary_kk ?? "",
      summary_ru: t.summary_ru ?? "",
      recommendations_kk: (t.recommendations_kk ?? []).join("\n"),
      recommendations_ru: (t.recommendations_ru ?? []).join("\n"),
      exercise_slugs: (t.exercise_slugs ?? []).join("\n"),
      specialist_kk: t.specialist_kk ?? "",
      specialist_ru: t.specialist_ru ?? "",
    })),
  };
}

export default async function AdminTestEdit({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [t, access] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getAdminAccess("editor"),
  ]);
  if (access.status !== "ok") return null;
  const { supabase } = access.session;

  const isNew = id === "new";
  let initial = newTestState();
  if (!isNew) {
    const { data: test } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
    if (!test) notFound();
    const { data: questions } = await supabase
      .from("test_questions")
      .select("*")
      .eq("test_id", id)
      .order("sort_order");
    initial = toEditorState(test, questions ?? []);
  }

  const { data: topicRows } = await supabase.from("topics").select("id, title_kk, title_ru").order("sort_order");
  const topics: TopicOption[] = (topicRows ?? []).map((tp) => ({
    id: tp.id,
    title: locale === "kk" ? tp.title_kk : tp.title_ru,
  }));

  return (
    <div>
      <h2 className="mb-5 text-2xl font-bold">
        {t("nav.tests")} — {isNew ? t("new") : t("edit")}
      </h2>
      <TestEditor id={isNew ? undefined : id} initial={initial} topics={topics} />
    </div>
  );
}
