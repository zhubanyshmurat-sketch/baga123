import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getAdminAccess } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, te, access, messages] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getTranslations({ locale, namespace: "errors" }),
    getAdminAccess("editor"),
    getMessages(),
  ]);

  if (access.status !== "ok") {
    const message =
      access.status === "not_configured"
        ? t("notConfigured")
        : access.status === "anonymous"
          ? t("loginRequired")
          : te("forbiddenText");
    return (
      <Container narrow className="py-16 text-center">
        <h1 className="text-3xl font-bold">{access.status === "forbidden" ? te("forbiddenTitle") : t("title")}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">{message}</p>
        <ButtonLink href={access.status === "anonymous" ? "/auth" : "/"} className="mt-6">
          {access.status === "anonymous" ? (await getTranslations({ locale, namespace: "header" }))("login") : te("home")}
        </ButtonLink>
      </Container>
    );
  }

  const isAdmin = access.session.role === "admin";
  const items = [
    { href: "/admin", label: t("nav.overview") },
    { href: "/admin/topics", label: t("nav.topics") },
    { href: "/admin/articles", label: t("nav.articles") },
    { href: "/admin/tests", label: t("nav.tests") },
    { href: "/admin/exercises", label: t("nav.exercises") },
    ...(isAdmin
      ? [
          { href: "/admin/contacts", label: t("nav.contacts") },
          { href: "/admin/users", label: t("nav.users") },
        ]
      : []),
  ] as const;

  return (
    <NextIntlClientProvider messages={messages}>
      <Container className="py-8">
        <h1 className="mb-1 text-3xl font-bold">{t("title")}</h1>
        <p className="mb-6 text-muted">{t("welcome")}</p>
        <nav aria-label={t("title")} className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 font-semibold hover:bg-primary-soft"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </Container>
    </NextIntlClientProvider>
  );
}
