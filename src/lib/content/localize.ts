/**
 * Single-language views of the content. These are what gets sent to Client Components, so the
 * browser never downloads the other language.
 */
import type {
  Exercise,
  ExerciseType,
  HelpContact,
  Level,
  Locale,
  PsyTest,
  Topic,
} from "./types";

export interface TestView {
  slug: string;
  topicSlug: string;
  title: string;
  description: string;
  durationMin: number;
  questions: {
    id: string;
    text: string;
    sensitive?: boolean;
    options: { value: number; weight: number; label: string; alert?: boolean }[];
  }[];
  thresholds: {
    level: Level;
    min: number;
    max: number;
    title: string;
    summary: string;
    recommendations: string[];
    exerciseSlugs: string[];
    specialist: string;
  }[];
}

export interface ExerciseLink {
  slug: string;
  type: ExerciseType;
  title: string;
}

export interface ContactView {
  id: string;
  kind: HelpContact["kind"];
  name: string;
  description: string;
  phone: string;
  hours: string;
  city: string;
  verified: boolean;
}

export function localizeTest(test: PsyTest, locale: Locale): TestView {
  return {
    slug: test.slug,
    topicSlug: test.topicSlug,
    title: test.title[locale],
    description: test.description[locale],
    durationMin: test.durationMin,
    questions: test.questions.map((q) => ({
      id: q.id,
      text: q.text[locale],
      ...(q.sensitive ? { sensitive: true } : {}),
      options: q.options.map((o) => ({
        value: o.value,
        weight: o.weight,
        label: o.label[locale],
        ...(o.alert ? { alert: true } : {}),
      })),
    })),
    thresholds: test.thresholds.map((t) => ({
      level: t.level,
      min: t.min,
      max: t.max,
      title: t.title[locale],
      summary: t.summary[locale],
      recommendations: t.recommendations[locale],
      exerciseSlugs: t.exerciseSlugs,
      specialist: t.specialist[locale],
    })),
  };
}

export function localizeContact(c: HelpContact, locale: Locale): ContactView {
  return {
    id: c.id,
    kind: c.kind,
    name: c.name[locale],
    description: c.description[locale],
    phone: c.phone,
    hours: c.hours[locale],
    city: c.city[locale],
    verified: c.verifiedAt !== null,
  };
}

export function exerciseLink(e: Exercise, locale: Locale): ExerciseLink {
  return { slug: e.slug, type: e.type, title: e.title[locale] };
}

export function topicTitle(topic: Topic, locale: Locale): string {
  return topic.title[locale];
}
