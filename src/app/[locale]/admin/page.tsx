import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import type { Locale } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/admin/auth";
import { CONTACT_STALE_DAYS } from "@/lib/constants";
import { daysAgoMs } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverview({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, format, access] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getFormatter({ locale }),
    getAdminAccess("editor"),
  ]);
  if (access.status !== "ok") return null;
  const { supabase, role } = access.session;

  const count = async (table: string, filter?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    if (filter) query = filter(query);
    const { count: n } = await query;
    return n ?? 0;
  };
  const [topics, articles, tests, exercises, drafts, contacts] = await Promise.all([
    count("topics"),
    count("articles"),
    count("tests"),
    count("exercises"),
    Promise.all([
      count("articles", (q) => q.eq("status", "draft")),
      count("tests", (q) => q.eq("status", "draft")),
    ]).then(([a, b]) => a + b),
    supabase.from("help_contacts").select("id, name_ru, phone, is_active, verified_at").eq("is_active", true),
  ]);

  const limit = daysAgoMs(CONTACT_STALE_DAYS);
  const stale = (contacts.data ?? []).filter((c) => !c.verified_at || new Date(c.verified_at).getTime() < limit);

  const stats = [
    [t("overview.topics"), topics],
    [t("overview.articles"), articles],
    [t("overview.tests"), tests],
    [t("overview.exercises"), exercises],
    [t("overview.drafts"), drafts],
  ] as const;

  return (
    <div className="space-y-8">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <li key={label}>
            <Card className="p-5">
              <p className="text-3xl font-extrabold tabular-nums">{value}</p>
              <p className="text-sm text-muted">{label}</p>
            </Card>
          </li>
        ))}
      </ul>

      {role === "admin" && (
        <Card className="p-6">
          <h2 className="text-xl font-bold">{t("overview.contactsTitle")}</h2>
          <p className={`mt-2 font-semibold ${stale.length > 0 ? "text-coral-strong" : "text-primary-strong"}`}>
            {stale.length > 0 ? t("overview.contactsStale", { count: stale.length }) : t("overview.contactsOk")}
          </p>
          {stale.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-muted">
              {stale.map((c) => (
                <li key={c.id}>
                  {c.name_ru} ({c.phone}) —{" "}
                  {c.verified_at
                    ? t("contacts.verifiedAt", { date: format.dateTime(new Date(c.verified_at), { dateStyle: "medium" }) })
                    : t("contacts.neverVerified")}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-muted">{t("contacts.checklist")}</p>
        </Card>
      )}
    </div>
  );
}
