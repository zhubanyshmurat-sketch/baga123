import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchBox } from "@/components/content/SearchBox";
import { Badge, cardLinkClass } from "@/components/ui/Card";
import { Container, PageHeader } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getArticles, getExercises, getTests, getTopics } from "@/lib/content";
import { SEARCH_TYPES, searchContent, type SearchType } from "@/lib/content/search";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return buildMetadata({ locale, path: "/search", title: t("title"), description: t("hint"), noindex: true });
}

const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const hrefFor: Record<SearchType, (slug: string) => string> = {
  topic: (s) => `/topics/${s}`,
  article: (s) => `/articles/${s}`,
  test: (s) => `/tests/${s}`,
  exercise: (s) => `/exercises/${s}`,
};

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = single(sp.q).slice(0, 100);
  const rawType = single(sp.type);
  const type = SEARCH_TYPES.find((x) => x === rawType);
  const t = await getTranslations({ locale, namespace: "search" });
  const [topics, articles, tests, exercises] = await Promise.all([
    getTopics(),
    getArticles(true),
    getTests(),
    getExercises(),
  ]);
  const topic = topics.find((tp) => tp.slug === single(sp.topic))?.slug;
  const topicTitles = new Map(topics.map((tp) => [tp.slug, tp.title[locale]]));

  const searched = q.trim() !== "" || type !== undefined || topic !== undefined;
  const hits = searched ? searchContent({ query: q, locale, type, topic, topics, articles, tests, exercises }) : [];

  const query = (over: { type?: string | null; topic?: string | null }) => {
    const next: Record<string, string> = {};
    if (q) next.q = q;
    const nextType = over.type === undefined ? type : over.type;
    const nextTopic = over.topic === undefined ? topic : over.topic;
    if (nextType) next.type = nextType;
    if (nextTopic) next.topic = nextTopic;
    return next;
  };
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
      active ? "border-primary bg-primary-soft text-primary-strong" : "border-border-strong hover:bg-surface-2",
    );

  return (
    <Container className="py-10">
      <PageHeader title={t("title")} />
      <SearchBox locale={locale} defaultValue={q} hidden={{ type, topic }} className="max-w-2xl" />

      <div className="mt-6 space-y-4">
        <div role="group" aria-label={t("type")} className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/search", query: query({ type: null }) }} className={chip(!type)} aria-current={!type}>
            {t("all")}
          </Link>
          {SEARCH_TYPES.map((x) => (
            <Link
              key={x}
              href={{ pathname: "/search", query: query({ type: x }) }}
              className={chip(type === x)}
              aria-current={type === x}
            >
              {t(`types.${x}`)}
            </Link>
          ))}
        </div>
        <div role="group" aria-label={t("topic")} className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/search", query: query({ topic: null }) }} className={chip(!topic)} aria-current={!topic}>
            {t("all")}
          </Link>
          {topics.map((tp) => (
            <Link
              key={tp.slug}
              href={{ pathname: "/search", query: query({ topic: tp.slug }) }}
              className={chip(topic === tp.slug)}
              aria-current={topic === tp.slug}
            >
              {tp.title[locale]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8" aria-live="polite">
        {!searched ? (
          <p className="text-muted">{t("hint")}</p>
        ) : hits.length === 0 ? (
          <p className="rounded-card bg-surface-2 p-6 text-muted">{t("empty")}</p>
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold text-muted">{t("results", { count: hits.length })}</p>
            <ul className="grid gap-4 md:grid-cols-2">
              {hits.map((h) => (
                <li key={`${h.type}-${h.slug}`}>
                  <Link href={hrefFor[h.type](h.slug)} className={cn(cardLinkClass, "flex h-full flex-col")}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{t(`types.${h.type}`)}</Badge>
                      {h.topicSlug && h.type !== "topic" && (
                        <Badge tone="primary">{topicTitles.get(h.topicSlug)}</Badge>
                      )}
                    </div>
                    <h2 className="text-lg font-bold leading-snug group-hover:text-primary-strong">{h.title}</h2>
                    <p className="mt-1 text-muted">{h.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Container>
  );
}
