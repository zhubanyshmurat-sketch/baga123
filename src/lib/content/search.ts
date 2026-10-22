import { normalize } from "@/lib/utils";
import type { Article, Exercise, Locale, PsyTest, Topic } from "./types";

export type SearchType = "topic" | "article" | "test" | "exercise";
export const SEARCH_TYPES: readonly SearchType[] = ["topic", "article", "test", "exercise"];

export interface SearchHit {
  type: SearchType;
  slug: string;
  title: string;
  excerpt: string;
  topicSlug?: string;
  score: number;
}

export interface SearchInput {
  query: string;
  locale: Locale;
  type?: SearchType;
  topic?: string;
  topics: Topic[];
  articles: Article[];
  tests: PsyTest[];
  exercises: Exercise[];
}

/** Counts occurrences of `needle` in `haystack`, capped so long texts cannot dominate. */
function occurrences(haystack: string, needle: string, cap = 5): number {
  let count = 0;
  let from = 0;
  while (count < cap) {
    const i = haystack.indexOf(needle, from);
    if (i === -1) break;
    count++;
    from = i + needle.length;
  }
  return count;
}

interface Candidate {
  type: SearchType;
  slug: string;
  topicSlug?: string;
  title: string;
  excerpt: string;
  /** Lower-weight text that is searched but not displayed. */
  extra: string;
}

function candidates(input: SearchInput): Candidate[] {
  const { locale: l } = input;
  const list: Candidate[] = [];
  for (const t of input.topics) {
    list.push({
      type: "topic",
      slug: t.slug,
      topicSlug: t.slug,
      title: t.title[l],
      excerpt: t.description[l],
      extra: [t.content[l].what, ...t.content[l].signs, ...t.content[l].tips].join(" "),
    });
  }
  for (const a of input.articles) {
    list.push({
      type: "article",
      slug: a.slug,
      topicSlug: a.topicSlug,
      title: a.title[l],
      excerpt: a.excerpt[l],
      extra: `${a.tags[l].join(" ")} ${a.body[l]}`,
    });
  }
  for (const t of input.tests) {
    list.push({
      type: "test",
      slug: t.slug,
      topicSlug: t.topicSlug,
      title: t.title[l],
      excerpt: t.description[l],
      extra: t.questions.map((q) => q.text[l]).join(" "),
    });
  }
  for (const e of input.exercises) {
    list.push({
      type: "exercise",
      slug: e.slug,
      topicSlug: e.topicSlugs[0],
      title: e.title[l],
      excerpt: e.description[l],
      extra: e.instructions[l].join(" "),
    });
  }
  return list;
}

/**
 * Searches topics, articles, tests and exercises. Every query word must appear somewhere;
 * title matches rank above description matches, which rank above body matches.
 * With an empty query the filters alone decide what is returned.
 */
export function searchContent(input: SearchInput): SearchHit[] {
  const tokens = normalize(input.query).split(" ").filter((t) => t.length > 0);
  const hits: SearchHit[] = [];

  for (const c of candidates(input)) {
    if (input.type && c.type !== input.type) continue;
    if (input.topic) {
      const matchesTopic =
        c.topicSlug === input.topic ||
        (c.type === "exercise" &&
          input.exercises.find((e) => e.slug === c.slug)?.topicSlugs.includes(input.topic));
      if (!matchesTopic) continue;
    }

    let score = 0;
    if (tokens.length > 0) {
      const title = normalize(c.title);
      const excerpt = normalize(c.excerpt);
      const extra = normalize(c.extra);
      let allMatch = true;
      for (const token of tokens) {
        const inTitle = title.includes(token);
        const inExcerpt = excerpt.includes(token);
        const inExtra = extra.includes(token);
        if (!inTitle && !inExcerpt && !inExtra) {
          allMatch = false;
          break;
        }
        if (inTitle) score += title.startsWith(token) ? 10 : 6;
        if (inExcerpt) score += 3;
        if (inExtra) score += occurrences(extra, token);
      }
      if (!allMatch) continue;
    }
    hits.push({
      type: c.type,
      slug: c.slug,
      title: c.title,
      excerpt: c.excerpt,
      topicSlug: c.topicSlug,
      score,
    });
  }

  const typeOrder: Record<SearchType, number> = { topic: 0, test: 1, exercise: 2, article: 3 };
  return hits.sort(
    (a, b) =>
      b.score - a.score ||
      typeOrder[a.type] - typeOrder[b.type] ||
      a.title.localeCompare(b.title, input.locale),
  );
}
