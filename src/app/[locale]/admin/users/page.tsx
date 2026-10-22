import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { RoleSelect } from "@/components/admin/RowActions";
import { Card } from "@/components/ui/Card";
import type { Locale } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsers({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, format, access] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getFormatter({ locale }),
    getAdminAccess("admin"),
  ]);
  if (access.status !== "ok") return null;

  const { data, error } = await access.session.supabase.rpc("admin_list_users");
  const users = (data ?? []) as {
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    created_at: string;
    consent_at: string | null;
  }[];

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">{t("nav.users")}</h2>
      <p className="mb-5 rounded-2xl bg-accent-soft p-4 text-sm">{t("users.privacy")}</p>
      {error && <p role="alert" className="mb-4 text-coral-strong">{t("errors.generic")}</p>}
      <Card className="overflow-x-auto p-2">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="p-3 font-semibold">{t("users.email")}</th>
              <th className="p-3 font-semibold">{t("users.name")}</th>
              <th className="p-3 font-semibold">{t("users.role")}</th>
              <th className="p-3 font-semibold">{t("users.registered")}</th>
              <th className="p-3 font-semibold">{t("users.consent")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 font-medium">{u.email}</td>
                <td className="p-3">{u.display_name ?? "—"}</td>
                <td className="p-3">
                  <RoleSelect userId={u.id} role={u.role} disabled={u.id === access.session.userId} />
                </td>
                <td className="p-3">{format.dateTime(new Date(u.created_at), { dateStyle: "medium" })}</td>
                <td className="p-3">
                  {u.consent_at ? format.dateTime(new Date(u.consent_at), { dateStyle: "medium" }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
