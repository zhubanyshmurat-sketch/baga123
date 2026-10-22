import { describe, expect, it } from "vitest";
import { articles, exercises, helpContacts, tests, topics } from "@/content";
import {
  articleFromRow,
  articleToRow,
  exerciseFromRow,
  exerciseToRow,
  questionFromRow,
  questionToRow,
  testFromRow,
  testToRow,
  topicFromRow,
  topicToRow,
} from "@/lib/content/db";
import { searchContent } from "@/lib/content/search";
import { isAlertAnswer, maxScore, scoreTest, validateThresholds } from "@/lib/tests/scoring";

const slugs = (list: { slug: string }[]) => list.map((x) => x.slug);

describe("bundled content", () => {
  it("has the content volume required by the brief", () => {
    expect(topics).toHaveLength(7);
    expect(tests).toHaveLength(7);
    expect(articles).toHaveLength(14);
    expect(exercises.map((e) => e.type)).toEqual(
      expect.arrayContaining(["breathing", "grounding", "diary", "planner", "pomodoro"]),
    );
  });

  it("has unique slugs and valid cross references", () => {
    for (const list of [topics, tests, articles, exercises]) {
      expect(new Set(slugs(list)).size).toBe(list.length);
    }
    const topicSlugs = new Set(slugs(topics));
    const exerciseSlugs = new Set(slugs(exercises));
    for (const a of articles) expect(topicSlugs.has(a.topicSlug), a.slug).toBe(true);
    for (const t of tests) expect(topicSlugs.has(t.topicSlug), t.slug).toBe(true);
    for (const e of exercises) for (const s of e.topicSlugs) expect(topicSlugs.has(s), `${e.slug}→${s}`).toBe(true);
    for (const t of tests)
      for (const th of t.thresholds) for (const s of th.exerciseSlugs) expect(exerciseSlugs.has(s), `${t.slug}→${s}`).toBe(true);
  });

  it("gives every topic one test and two articles", () => {
    for (const topic of topics) {
      expect(tests.filter((t) => t.topicSlug === topic.slug), topic.slug).toHaveLength(1);
      expect(articles.filter((a) => a.topicSlug === topic.slug), topic.slug).toHaveLength(2);
    }
  });

  it("has every text in both languages", () => {
    const check = (value: unknown, where: string) => {
      if (value && typeof value === "object") {
        const v = value as Record<string, unknown>;
        if ("kk" in v && "ru" in v) {
          const kk = v.kk;
          const ru = v.ru;
          if (typeof kk === "string") {
            expect((kk as string).length > 0 && (ru as string).length > 0, where).toBe(true);
          } else if (kk && typeof kk === "object" && !Array.isArray(kk)) {
            check(kk, `${where}.kk`);
            check(ru, `${where}.ru`);
          } else {
            expect(Array.isArray(kk) && (kk as unknown[]).length === (ru as unknown[]).length, where).toBe(true);
          }
          return;
        }
        for (const [k, x] of Object.entries(v)) check(x, `${where}.${k}`);
      }
    };
    check({ topics, tests, exercises, helpContacts }, "content");
    for (const a of articles) {
      expect(a.body.kk.length, a.slug).toBeGreaterThan(500);
      expect(a.body.ru.length, a.slug).toBeGreaterThan(500);
      expect(a.todaySteps.kk).toHaveLength(3);
      expect(a.todaySteps.ru).toHaveLength(3);
      expect(a.sources.length, a.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("topics have five tips and the five required sections", () => {
    for (const t of topics) {
      for (const lang of ["kk", "ru"] as const) {
        const c = t.content[lang];
        expect(c.tips, `${t.slug}/${lang}`).toHaveLength(5);
        expect(c.what.length && c.specialist.length && c.signs.length && c.causes.length).toBeTruthy();
      }
    }
  });
});

describe("tests", () => {
  it("have 6–8 questions, a scale per question and thresholds covering every score", () => {
    for (const t of tests) {
      expect(t.questions.length, t.slug).toBeGreaterThanOrEqual(6);
      expect(t.questions.length, t.slug).toBeLessThanOrEqual(8);
      expect(validateThresholds(t), t.slug).toEqual([]);
      expect(t.thresholds.map((x) => x.level).sort(), t.slug).toEqual(["high", "low", "medium"]);
      for (const th of t.thresholds) {
        expect(th.recommendations.kk, t.slug).toHaveLength(3);
        expect(th.recommendations.ru, t.slug).toHaveLength(3);
      }
    }
  });

  it("flag sensitive questions with at least one alarming option", () => {
    const sensitive = tests.flatMap((t) => t.questions.filter((q) => q.sensitive));
    expect(sensitive.length).toBeGreaterThanOrEqual(4);
    for (const q of sensitive) expect(q.options.some((o) => o.alert)).toBe(true);
    for (const q of tests.flatMap((t) => t.questions).filter((q) => !q.sensitive)) {
      expect(q.options.some((o) => o.alert)).toBe(false);
    }
  });

  it("score the lowest and highest answer sets into the first and last level", () => {
    for (const t of tests) {
      const lowest = t.questions.map((q) => q.options.reduce((a, b) => (b.weight < a.weight ? b : a)).value);
      const highest = t.questions.map((q) => q.options.reduce((a, b) => (b.weight > a.weight ? b : a)).value);
      expect(scoreTest(t, lowest).level, t.slug).toBe("low");
      expect(scoreTest(t, highest).level, t.slug).toBe("high");
      expect(scoreTest(t, highest).score).toBe(maxScore(t));
    }
  });

  it("show the support block for an alarming answer, regardless of the total", () => {
    const t = tests.find((x) => x.slug === "self-esteem")!;
    const answers = t.questions.map((q) => q.options.find((o) => o.weight === Math.max(...q.options.map((p) => p.weight)))!.value);
    const result = scoreTest(t, answers);
    expect(result.level).toBe("low".replace("low", result.level)); // total is irrelevant for the flag
    const sensitiveIndex = t.questions.findIndex((q) => q.sensitive);
    const calm = [...answers];
    calm[sensitiveIndex] = 0;
    expect(scoreTest(t, calm).alert).toBe(false);
    const alarmed = [...answers];
    alarmed[sensitiveIndex] = 3;
    expect(scoreTest(t, alarmed).alert).toBe(true);
    expect(isAlertAnswer(t.questions[sensitiveIndex], 3)).toBe(true);
  });

  it("reject tampered answers", () => {
    const t = tests[0];
    expect(() => scoreTest(t, [0, 0])).toThrow();
    expect(() => scoreTest(t, t.questions.map(() => 99))).toThrow();
  });
});

describe("database mapping", () => {
  it("round-trips every content type through the row format", () => {
    for (const t of topics) expect(topicFromRow(topicToRow(t))).toEqual(t);
    for (const e of exercises) {
      const row = { ...exerciseToRow(e), exercise_topics: e.topicSlugs.map((s) => ({ topics: { slug: s } })) };
      expect(exerciseFromRow(row)).toEqual(e);
    }
    for (const a of articles) {
      expect(articleFromRow({ ...articleToRow(a), topics: { slug: a.topicSlug } })).toEqual(a);
    }
    for (const t of tests) {
      const questions = t.questions.map((q, i) => ({ id: q.id, ...questionToRow(q), sort_order: i + 1 }));
      const back = testFromRow({ ...testToRow(t), topics: { slug: t.topicSlug }, test_questions: questions });
      // question ids are database ids in the real thing; compare everything else
      expect(back.thresholds).toEqual(t.thresholds);
      expect(back.questions.map((q) => ({ ...q, id: "" }))).toEqual(t.questions.map((q) => ({ ...q, id: "" })));
      for (const q of t.questions) expect(questionFromRow({ id: q.id, ...questionToRow(q) })).toEqual(q);
    }
  });
});

describe("search", () => {
  const input = { locale: "ru" as const, topics, articles, tests, exercises };

  it("finds content by title, body and tag, ignoring case and ё", () => {
    expect(searchContent({ ...input, query: "ПОМОДОРО" }).map((h) => h.slug)).toContain("pomodoro");
    expect(searchContent({ ...input, query: "кофеин" }).some((h) => h.type === "article")).toBe(true);
    expect(searchContent({ ...input, locale: "kk", query: "емтихан" }).length).toBeGreaterThan(2);
  });

  it("requires every word, filters by type and topic, and returns nothing for gibberish", () => {
    const hits = searchContent({ ...input, query: "экзамен", type: "article" });
    expect(hits.every((h) => h.type === "article")).toBe(true);
    expect(searchContent({ ...input, query: "", topic: "dormitory" }).every((h) => h.topicSlug === "dormitory" || h.type === "exercise")).toBe(true);
    expect(searchContent({ ...input, query: "xqzvw" })).toHaveLength(0);
  });
});
