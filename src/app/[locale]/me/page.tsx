import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProgressDashboard } from "@/components/me/ProgressDashboard";
import { Container, PageHeader } from "@/components/ui/Container";
import type { Locale } from "@/i18n/routing";
import { getArticles } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "me" });
  return buildMetadata({ locale, path: "/me", title: t("title"), description: t("lead"), noindex: true });
}

/**
 * The page shell is static; the dashboard reads the visitor's own records in the browser
 * (this device for guests, the database under row level security for students).
 */
export default async function MePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tn, articles] = await Promise.all([
    getTranslations({ locale, namespace: "me" }),
    getTranslations({ locale, namespace: "nav" }),
    getArticles(),
  ]);

  return (
    <Container className="py-10">
      <PageHeader title={t("title")} lead={t("lead")} />
      <ProgressDashboard
        articles={articles.map((a) => ({ slug: a.slug, title: a.title[locale] }))}
        adminLabel={tn("admin")}
      />
    </Container>
  );
}
