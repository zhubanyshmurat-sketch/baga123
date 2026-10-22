import { Pencil, Plus } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { DeleteButton } from "@/components/admin/RowActions";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminTests({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tt, format, access] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getTranslations({ locale, namespace: "tests" }),
    getFormatter({ locale }),
    getAdminAccess("editor"),
  ]);
  if (access.status !== "ok") return null;

  const { data, error } = await access.session.supabase
    .from("tests")
    .select("id, slug, title_kk, title_ru, status, updated_at, test_questions(count)")
    .order("created_at");

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t("nav.tests")}</h2>
        <ButtonLink href="/admin/tests/new">
          <Plus className="size-4" aria-hidden="true" />
          {t("new")}
        </ButtonLink>
      </div>
      {error && <p role="alert" className="mb-4 text-coral-strong">{t("errors.generic")}</p>}
      {(data ?? []).length === 0 && !error && <Card className="p-6 text-muted">{t("empty")}</Card>}
      <ul className="space-y-3">
        {(data ?? []).map((row) => {
          const questions = Array.isArray(row.test_questions) ? (row.test_questions[0] as { count: number } | undefined)?.count ?? 0 : 0;
          return (
            <li key={row.id}>
              <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/tests/${row.id}`} className="font-bold hover:text-primary-strong">
                    {locale === "kk" ? row.title_kk : row.title_ru}
                  </Link>
                  <p className="text-sm text-muted">
                    {row.slug} · {tt("questionsCount", { count: questions })}
                  </p>
                </div>
                <Badge tone={row.status === "published" ? "primary" : "neutral"}>
                  {row.status === "published" ? t("published") : t("draft")}
                </Badge>
                <span className="text-sm text-muted">
                  {t("updated")}: {format.dateTime(new Date(row.updated_at), { dateStyle: "medium" })}
                </span>
                <div className="flex items-center">
                  <Link href={`/admin/tests/${row.id}`} aria-label={t("edit")} title={t("edit")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <DeleteButton resource="tests" id={row.id} />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
