"use client";

import { Clock, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Badge, cardLinkClass } from "@/components/ui/Card";
import { cn, normalize } from "@/lib/utils";

export interface ArticleItem {
  slug: string;
  title: string;
  excerpt: string;
  topicSlug: string;
  tags: string[];
  readingTime: number;
}

export interface TopicChip {
  slug: string;
  title: string;
}

/** Article list with instant text search and a topic filter; everything runs in the browser. */
export function ArticleBrowser({ items, topics }: { items: ArticleItem[]; topics: TopicChip[] }) {
  const t = useTranslations("articles");
  const ts = useTranslations("search");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const topicTitles = useMemo(() => new Map(topics.map((tp) => [tp.slug, tp.title])), [topics]);

  const visible = useMemo(() => {
    const tokens = normalize(query).split(" ").filter(Boolean);
    return items.filter((a) => {
      if (topic && a.topicSlug !== topic) return false;
      if (tokens.length === 0) return true;
      const haystack = normalize(`${a.title} ${a.excerpt} ${a.tags.join(" ")}`);
      return tokens.every((tok) => haystack.includes(tok));
    });
  }, [items, query, topic]);

  return (
    <div>
      <div role="search" className="relative max-w-xl">
        <label htmlFor="article-search" className="sr-only-text">
          {t("searchPlaceholder")}
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id="article-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="min-h-12 w-full rounded-full border border-border-strong bg-surface py-3 pl-12 pr-4 text-base placeholder:text-muted"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("topic")}>
        {[{ slug: "", title: t("allTopics") }, ...topics].map((tp) => {
          const active = (topic ?? "") === tp.slug;
          return (
            <button
              key={tp.slug || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setTopic(tp.slug || null)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                active
                  ? "border-primary bg-primary-soft text-primary-strong"
                  : "border-border-strong hover:bg-surface-2",
              )}
            >
              {tp.title}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-sm text-muted" role="status" aria-live="polite">
        {ts("results", { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-card bg-surface-2 p-6 text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => (
            <li key={a.slug}>
              <Link href={`/articles/${a.slug}`} className={cn(cardLinkClass, "flex h-full flex-col")}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{topicTitles.get(a.topicSlug)}</Badge>
                  <span className="inline-flex items-center gap-1 text-sm text-muted">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {t("readingTime", { count: a.readingTime })}
                  </span>
                </div>
                <h2 className="text-lg font-bold leading-snug group-hover:text-primary-strong">{a.title}</h2>
                <p className="mt-2 flex-1 text-muted">{a.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
