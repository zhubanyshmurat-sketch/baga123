/**
 * Mapping between database rows (snake_case, *_kk / *_ru columns) and the domain types.
 * Used by the content loaders (rows → domain) and by the seed generator (domain → rows),
 * and round-trip tested so the two directions cannot drift apart.
 */
import type {
  Article,
  Exercise,
  ExerciseType,
  HelpContact,
  Level,
  PsyTest,
  Topic,
  TopicContent,
  TestOption,
  TestQuestion,
  TestThreshold,
} from "./types";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const emptyTopicContent: TopicContent = {
  what: "",
  signs: [],
  causes: [],
  tips: [],
  specialist: "",
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// --- topics ---------------------------------------------------------------------------------

export function topicFromRow(r: Row): Topic {
  return {
    slug: r.slug,
    icon: r.icon ?? "heart",
    sortOrder: r.sort_order ?? 0,
    title: { kk: r.title_kk, ru: r.title_ru },
    description: { kk: r.description_kk ?? "", ru: r.description_ru ?? "" },
    content: {
      kk: { ...emptyTopicContent, ...(r.content_kk ?? {}) },
      ru: { ...emptyTopicContent, ...(r.content_ru ?? {}) },
    },
  };
}

export function topicToRow(t: Topic): Row {
  return {
    slug: t.slug,
    icon: t.icon,
    sort_order: t.sortOrder,
    title_kk: t.title.kk,
    title_ru: t.title.ru,
    description_kk: t.description.kk,
    description_ru: t.description.ru,
    content_kk: t.content.kk,
    content_ru: t.content.ru,
  };
}

// --- articles -------------------------------------------------------------------------------

export function articleFromRow(r: Row): Article {
  return {
    slug: r.slug,
    topicSlug: r.topics?.slug ?? r.topic_slug ?? "",
    title: { kk: r.title_kk, ru: r.title_ru },
    excerpt: { kk: r.excerpt_kk ?? "", ru: r.excerpt_ru ?? "" },
    body: { kk: r.body_kk ?? "", ru: r.body_ru ?? "" },
    todaySteps: { kk: asArray(r.today_steps_kk), ru: asArray(r.today_steps_ru) },
    tags: { kk: asArray(r.tags_kk), ru: asArray(r.tags_ru) },
    sources: asArray<string>(r.sources),
    readingTime: r.reading_time ?? 5,
    publishedAt: (r.published_at ?? r.created_at ?? "").slice(0, 10),
  };
}

export function articleToRow(a: Article): Row {
  return {
    slug: a.slug,
    title_kk: a.title.kk,
    title_ru: a.title.ru,
    excerpt_kk: a.excerpt.kk,
    excerpt_ru: a.excerpt.ru,
    body_kk: a.body.kk,
    body_ru: a.body.ru,
    today_steps_kk: a.todaySteps.kk,
    today_steps_ru: a.todaySteps.ru,
    tags_kk: a.tags.kk,
    tags_ru: a.tags.ru,
    sources: a.sources,
    reading_time: a.readingTime,
    status: "published",
    published_at: `${a.publishedAt}T08:00:00Z`,
  };
}

// --- tests ----------------------------------------------------------------------------------

export function questionFromRow(r: Row): TestQuestion {
  const options = asArray<Row>(r.options).map(
    (o): TestOption => ({
      value: o.value,
      weight: o.weight,
      label: { kk: o.label_kk, ru: o.label_ru },
      ...(o.alert ? { alert: true } : {}),
    }),
  );
  return {
    id: r.id,
    text: { kk: r.text_kk, ru: r.text_ru },
    options,
    ...(r.is_sensitive ? { sensitive: true } : {}),
  };
}

export function questionToRow(q: TestQuestion): Row {
  return {
    text_kk: q.text.kk,
    text_ru: q.text.ru,
    options: q.options.map((o) => ({
      value: o.value,
      weight: o.weight,
      label_kk: o.label.kk,
      label_ru: o.label.ru,
      ...(o.alert ? { alert: true } : {}),
    })),
    is_sensitive: q.sensitive === true,
  };
}

export function thresholdFromRow(r: Row): TestThreshold {
  return {
    level: r.level as Level,
    min: r.min,
    max: r.max,
    title: { kk: r.title_kk ?? "", ru: r.title_ru ?? "" },
    summary: { kk: r.summary_kk ?? "", ru: r.summary_ru ?? "" },
    recommendations: {
      kk: asArray(r.recommendations_kk),
      ru: asArray(r.recommendations_ru),
    },
    exerciseSlugs: asArray(r.exercise_slugs),
    specialist: { kk: r.specialist_kk ?? "", ru: r.specialist_ru ?? "" },
  };
}

export function thresholdToRow(t: TestThreshold): Row {
  return {
    level: t.level,
    min: t.min,
    max: t.max,
    title_kk: t.title.kk,
    title_ru: t.title.ru,
    summary_kk: t.summary.kk,
    summary_ru: t.summary.ru,
    recommendations_kk: t.recommendations.kk,
    recommendations_ru: t.recommendations.ru,
    exercise_slugs: t.exerciseSlugs,
    specialist_kk: t.specialist.kk,
    specialist_ru: t.specialist.ru,
  };
}

export function testFromRow(r: Row): PsyTest {
  const questions = asArray<Row>(r.test_questions)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(questionFromRow);
  return {
    slug: r.slug,
    topicSlug: r.topics?.slug ?? r.topic_slug ?? "",
    title: { kk: r.title_kk, ru: r.title_ru },
    description: { kk: r.description_kk ?? "", ru: r.description_ru ?? "" },
    durationMin: r.duration_min ?? 3,
    questions,
    thresholds: asArray<Row>(r.thresholds).map(thresholdFromRow),
  };
}

export function testToRow(t: PsyTest): Row {
  return {
    slug: t.slug,
    title_kk: t.title.kk,
    title_ru: t.title.ru,
    description_kk: t.description.kk,
    description_ru: t.description.ru,
    duration_min: t.durationMin,
    thresholds: t.thresholds.map(thresholdToRow),
    status: "published",
  };
}

// --- exercises ------------------------------------------------------------------------------

export function exerciseFromRow(r: Row): Exercise {
  const topicSlugs = asArray<Row>(r.exercise_topics)
    .map((et) => et.topics?.slug)
    .filter((s): s is string => typeof s === "string");
  return {
    slug: r.slug,
    type: r.type as ExerciseType,
    title: { kk: r.title_kk, ru: r.title_ru },
    description: { kk: r.description_kk ?? "", ru: r.description_ru ?? "" },
    instructions: { kk: asArray(r.instructions_kk), ru: asArray(r.instructions_ru) },
    durationMin: r.duration_min ?? 5,
    config: (r.config ?? {}) as Record<string, unknown>,
    topicSlugs,
    ...(r.popular ? { popular: true } : {}),
  };
}

export function exerciseToRow(e: Exercise): Row {
  return {
    slug: e.slug,
    type: e.type,
    title_kk: e.title.kk,
    title_ru: e.title.ru,
    description_kk: e.description.kk,
    description_ru: e.description.ru,
    instructions_kk: e.instructions.kk,
    instructions_ru: e.instructions.ru,
    duration_min: e.durationMin,
    config: e.config,
    popular: e.popular === true,
    status: "published",
  };
}

// --- help contacts --------------------------------------------------------------------------

export function contactFromRow(r: Row): HelpContact {
  return {
    id: r.id,
    kind: r.kind,
    name: { kk: r.name_kk, ru: r.name_ru },
    description: { kk: r.description_kk ?? "", ru: r.description_ru ?? "" },
    phone: r.phone,
    hours: { kk: r.hours_kk ?? "", ru: r.hours_ru ?? "" },
    city: { kk: r.city_kk ?? "", ru: r.city_ru ?? "" },
    isActive: r.is_active ?? true,
    sortOrder: r.sort_order ?? 0,
    verifiedAt: r.verified_at ?? null,
  };
}

export function contactToRow(c: HelpContact): Row {
  return {
    kind: c.kind,
    name_kk: c.name.kk,
    name_ru: c.name.ru,
    description_kk: c.description.kk,
    description_ru: c.description.ru,
    phone: c.phone,
    hours_kk: c.hours.kk,
    hours_ru: c.hours.ru,
    city_kk: c.city.kk,
    city_ru: c.city.ru,
    is_active: c.isActive,
    sort_order: c.sortOrder,
    verified_at: c.verifiedAt,
  };
}
