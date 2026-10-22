import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getArticles, getExercises, getTests, getTopics } from "@/lib/content";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

/** One entry per page and language, each pointing at its translation (hreflang). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [topics, articles, tests, exercises] = await Promise.all([
    getTopics(),
    getArticles(),
    getTests(),
    getExercises(),
  ]);

  const paths: { path: string; priority: number; lastModified?: string }[] = [
    { path: "", priority: 1 },
    { path: "/topics", priority: 0.9 },
    { path: "/tests", priority: 0.9 },
    { path: "/exercises", priority: 0.9 },
    { path: "/articles", priority: 0.8 },
    { path: "/help", priority: 0.8 },
    { path: "/about", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
    ...topics.map((t) => ({ path: `/topics/${t.slug}`, priority: 0.8 })),
    ...tests.map((t) => ({ path: `/tests/${t.slug}`, priority: 0.8 })),
    ...exercises.map((e) => ({ path: `/exercises/${e.slug}`, priority: 0.7 })),
    ...articles.map((a) => ({ path: `/articles/${a.slug}`, priority: 0.7, lastModified: a.publishedAt })),
  ];

  return paths.flatMap(({ path, priority, lastModified }) =>
    routing.locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified,
      priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}${path}`])),
      },
    })),
  );
}
