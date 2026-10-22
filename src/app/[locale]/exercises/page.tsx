import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExerciseCard } from "@/components/content/cards";
import { Container, PageHeader } from "@/components/ui/Container";
import type { Locale } from "@/i18n/routing";
import { getExercises } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exercises" });
  return buildMetadata({ locale, path: "/exercises", title: t("title"), description: t("lead") });
}

export default async function ExercisesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "exercises" });
  const exercises = await getExercises();

  return (
    <Container className="py-10">
      <PageHeader title={t("title")} lead={t("lead")} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exercises.map((exercise) => (
          <li key={exercise.slug}>
            <ExerciseCard exercise={exercise} locale={locale} />
          </li>
        ))}
      </ul>
    </Container>
  );
}
