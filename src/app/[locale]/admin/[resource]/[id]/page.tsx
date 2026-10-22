import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ResourceForm, type TopicOption } from "@/components/admin/ResourceForm";
import { Card } from "@/components/ui/Card";
import { ICON_NAMES } from "@/components/ui/TopicIcon";
import type { Locale } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/admin/auth";
import { isResourceKey, resources } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale; resource: string; id: string }> };

const defaults: Record<string, Record<string, unknown>> = {
  topics: { icon: "heart", sort_order: 0 },
  articles: { status: "draft", reading_time: 5 },
  exercises: { type: "breathing", status: "published", duration_min: 5, config: {} },
  contacts: { kind: "hotline", is_active: true, sort_order: 0 },
};

export default async function AdminEdit({ params }: Props) {
  const { locale, resource: key, id } = await params;
  setRequestLocale(locale);
  if (!isResourceKey(key)) notFound();
  const resource = resources[key];

  const [t, access] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getAdminAccess(resource.role),
  ]);
  if (access.status !== "ok") return null;
  const { supabase } = access.session;

  const isNew = id === "new";
  let initial: Record<string, unknown> = defaults[key];
  let linked: string[] = [];

  if (!isNew) {
    const { data } = await supabase.from(resource.table).select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    initial = data;
    if (resource.links) {
      const { data: rows } = await supabase
        .from(resource.links.table)
        .select(resource.links.otherKey)
        .eq(resource.links.ownKey, id);
      linked = ((rows ?? []) as unknown as Record<string, string>[]).map((r) => r[resource.links!.otherKey]);
    }
  }

  const { data: topicRows } = await supabase.from("topics").select("id, title_kk, title_ru").order("sort_order");
  const topics: TopicOption[] = (topicRows ?? []).map((tp) => ({
    id: tp.id,
    title: locale === "kk" ? tp.title_kk : tp.title_ru,
  }));

  return (
    <div>
      <h2 className="mb-5 text-2xl font-bold">
        {t(`nav.${key}` as never)} — {isNew ? t("new") : t("edit")}
      </h2>
      <Card className="p-5 sm:p-7">
        <ResourceForm
          resource={resource}
          initial={initial}
          id={isNew ? undefined : id}
          topics={topics}
          linkedTopicIds={linked}
          iconNames={ICON_NAMES}
        />
      </Card>
    </div>
  );
}
