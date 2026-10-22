import { Pencil, Plus } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DeleteButton, VerifyButton } from "@/components/admin/RowActions";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/admin/auth";
import { isResourceKey, resources } from "@/lib/admin/resources";
import { CONTACT_STALE_DAYS } from "@/lib/constants";
import { daysAgoMs } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale; resource: string }> };

export default async function AdminList({ params }: Props) {
  const { locale, resource: key } = await params;
  setRequestLocale(locale);
  if (!isResourceKey(key)) notFound();
  const resource = resources[key];

  const [t, format, access] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getFormatter({ locale }),
    getAdminAccess(resource.role),
  ]);
  if (access.status !== "ok") return null;

  const { data, error } = await access.session.supabase
    .from(resource.table)
    .select("*")
    .order(key === "topics" || key === "contacts" ? "sort_order" : "updated_at", { ascending: key === "topics" || key === "contacts" });

  const staleBefore = daysAgoMs(CONTACT_STALE_DAYS);
  const rows = (data ?? []) as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t(`nav.${key}` as never)}</h2>
        <ButtonLink href={`/admin/${key}/new`}>
          <Plus className="size-4" aria-hidden="true" />
          {t("new")}
        </ButtonLink>
      </div>

      {key === "contacts" && <p className="mb-5 rounded-2xl bg-accent-soft p-4 text-sm">{t("contacts.checklist")}</p>}
      {error && <p role="alert" className="mb-4 text-coral-strong">{t("errors.generic")}</p>}
      {rows.length === 0 && !error && <Card className="p-6 text-muted">{t("empty")}</Card>}

      <ul className="space-y-3">
        {rows.map((row) => {
          const title = (locale === "kk" ? row[`${resource.titleColumn.replace(/_ru$/, "_kk")}`] : row[resource.titleColumn]) ?? row[resource.titleColumn];
          const secondary = key === "contacts" ? row.phone : row.slug;
          const verifiedAt: string | null = row.verified_at ?? null;
          const isStale = key === "contacts" && row.is_active && (!verifiedAt || new Date(verifiedAt).getTime() < staleBefore);
          return (
            <li key={row.id}>
              <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/${key}/${row.id}`} className="font-bold hover:text-primary-strong">
                    {title}
                  </Link>
                  <p className="text-sm text-muted">{secondary}</p>
                </div>
                {"status" in row && (
                  <Badge tone={row.status === "published" ? "primary" : "neutral"}>
                    {row.status === "published" ? t("published") : t("draft")}
                  </Badge>
                )}
                {key === "contacts" && (
                  <>
                    <Badge tone={row.is_active ? "primary" : "neutral"}>{row.is_active ? t("active") : t("inactive")}</Badge>
                    <span className={`text-sm ${isStale ? "font-semibold text-coral-strong" : "text-muted"}`}>
                      {verifiedAt
                        ? t("contacts.verifiedAt", { date: format.dateTime(new Date(verifiedAt), { dateStyle: "medium" }) })
                        : t("contacts.neverVerified")}
                      {isStale && ` · ${t("contacts.stale")}`}
                    </span>
                    <VerifyButton id={row.id} />
                  </>
                )}
                {row.updated_at && key !== "contacts" && (
                  <span className="text-sm text-muted">
                    {t("updated")}: {format.dateTime(new Date(row.updated_at), { dateStyle: "medium" })}
                  </span>
                )}
                <div className="flex items-center">
                  <Link
                    href={`/admin/${key}/${row.id}`}
                    aria-label={t("edit")}
                    title={t("edit")}
                    className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <DeleteButton resource={key} id={row.id} />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
