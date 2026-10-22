import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Container, PageHeader } from "@/components/ui/Container";
import type { Locale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return buildMetadata({ locale, path: "/auth/reset", title: t("resetTitle"), description: t("forgotText"), noindex: true });
}

export default async function ResetPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <Container narrow className="py-10">
      <PageHeader title={t("resetTitle")} />
      <ResetPasswordForm />
    </Container>
  );
}
