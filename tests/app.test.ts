import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import kk from "../messages/kk.json";
import ru from "../messages/ru.json";
import { generateSeed } from "../scripts/seed-sql";
import { tests, topics } from "@/content";
import { buildRow, resources } from "@/lib/admin/resources";
import { checkTestPayload, testPayloadSchema } from "@/lib/admin/test-schema";
import { PRESETS, clampCycles, cycleSeconds, stateAt, totalSeconds } from "@/lib/exercises/breathing";
import { testFromRow } from "@/lib/content/db";
import { averageMood, buildMoodSeries } from "@/lib/personal/mood";
import { computeStreak, dateKey, normalize } from "@/lib/utils";

vi.mock("server-only", () => ({}));

/** Every dotted key path of a messages object (arrays count as leaves). */
function paths(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.entries(obj).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("translations", () => {
  it("have identical keys in Kazakh and Russian, and no empty strings", () => {
    expect(paths(kk).sort()).toEqual(paths(ru).sort());
    for (const dict of [kk, ru]) {
      const walk = (v: unknown, where: string) => {
        if (typeof v === "string") expect(v.trim().length, where).toBeGreaterThan(0);
        else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
        else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, `${where}.${k}`));
      };
      walk(dict, "messages");
    }
  });

  it("use the same ICU placeholders in both languages", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)(?:,|\})/g)].map((m) => m[1]).sort();
    const flat = (d: unknown) => Object.fromEntries(paths(d).map((p) => [p, p.split(".").reduce((o: any, k) => o?.[k], d)])); // eslint-disable-line @typescript-eslint/no-explicit-any
    const a = flat(kk);
    const b = flat(ru);
    for (const key of Object.keys(a)) {
      if (typeof a[key] === "string" && typeof b[key] === "string") {
        expect(vars(a[key]), key).toEqual(vars(b[key]));
      }
    }
  });
});

describe("design tokens", () => {
  const css = fs.readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf8");
  const tokens = (selector: RegExp) => {
    const block = css.match(selector)?.[1] ?? "";
    return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
  };
  const light = tokens(/:root\s*\{([^}]*)\}/);
  const dark = tokens(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);

  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // [foreground, background, minimum ratio]: 4.5 for text, 3 for UI boundaries / focus rings
  const pairs: [string, string, number][] = [
    ["fg", "bg", 4.5], ["fg", "surface", 4.5], ["muted", "bg", 4.5], ["muted", "surface", 4.5], ["muted", "surface-2", 4.5],
    ["on-primary", "primary", 4.5], ["on-accent", "accent", 4.5], ["on-coral", "coral", 4.5],
    ["primary-strong", "bg", 4.5], ["primary-strong", "surface", 4.5], ["primary-strong", "primary-soft", 4.5],
    ["accent-strong", "bg", 4.5], ["accent-strong", "accent-soft", 4.5], ["coral-strong", "bg", 4.5], ["coral-strong", "coral-soft", 4.5],
    ["fg", "primary-soft", 4.5], ["fg", "accent-soft", 4.5], ["fg", "coral-soft", 4.5],
    ["border-strong", "bg", 3], ["border-strong", "surface", 3], ["ring", "bg", 3], ["ring", "surface", 3],
  ];

  for (const [name, set] of [["light", light], ["dark", dark]] as const) {
    it(`meet WCAG AA contrast in the ${name} theme`, () => {
      for (const [fg, bg, min] of pairs) {
        expect(set[fg] && set[bg], `${fg}/${bg} defined`).toBeTruthy();
        expect(ratio(set[fg], set[bg]), `${name}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
      }
    });
  }
});

describe("breathing timer", () => {
  it("walks through the 4-7-8 phases and finishes after the requested cycles", () => {
    expect(cycleSeconds("478")).toBe(19);
    expect(totalSeconds("478", 4)).toBe(76);
    expect(stateAt("478", 4, 0)).toMatchObject({ phase: "inhale", cycle: 1, secondsLeft: 4, fill: 0 });
    expect(stateAt("478", 4, 4_500)).toMatchObject({ phase: "holdIn", fill: 1 });
    expect(stateAt("478", 4, 12_000)).toMatchObject({ phase: "exhale" });
    expect(stateAt("478", 4, 19_000)).toMatchObject({ cycle: 2, phase: "inhale" });
    expect(stateAt("478", 4, 76_000).done).toBe(true);
  });

  it("has four equal phases in box breathing and clamps the cycle count", () => {
    expect(PRESETS.box.map((p) => p.seconds)).toEqual([4, 4, 4, 4]);
    expect(stateAt("box", 2, 13_000)).toMatchObject({ phase: "holdOut", fill: 0 });
    expect([clampCycles(0), clampCycles(99), clampCycles(NaN), clampCycles(4.4)]).toEqual([1, 10, 1, 4]);
  });
});

describe("mood and streak helpers", () => {
  const now = new Date("2026-10-22T10:00:00+05:00");
  it("builds a 30-day series with gaps and an average", () => {
    const series = buildMoodSeries([{ date: "2026-10-22", mood: 4 }, { date: "2026-10-20", mood: 2 }], 30, now);
    expect(series).toHaveLength(30);
    expect(series.at(-1)).toEqual({ date: "2026-10-22", mood: 4 });
    expect(series.at(-2)?.mood).toBeNull();
    expect(averageMood(series)).toBe(3);
    expect(averageMood(buildMoodSeries([], 30, now))).toBeNull();
  });

  it("counts consecutive practice days and survives until midnight", () => {
    expect(computeStreak(["2026-10-22", "2026-10-21", "2026-10-20", "2026-10-18"], now)).toBe(3);
    expect(computeStreak(["2026-10-21", "2026-10-20"], now)).toBe(2); // not yet practised today
    expect(computeStreak(["2026-10-19"], now)).toBe(0);
    expect(dateKey(new Date("2026-10-21T20:00:00Z"))).toBe("2026-10-22"); // Almaty is UTC+5
  });

  it("normalises search text", () => {
    expect(normalize("  ЁЛКА   Қазақ ")).toBe("елка қазақ");
  });
});

describe("admin form builder", () => {
  const form = (entries: Record<string, string | string[]>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
    return f;
  };

  it("builds a bilingual article row, ignores undeclared fields and validates the slug", () => {
    const ok = buildRow(
      resources.articles,
      form({
        slug: "Hello-World", status: "published", reading_time: "999", title_kk: "А", title_ru: "Б",
        excerpt_kk: "", excerpt_ru: "", body_kk: "x", body_ru: "y", today_steps_kk: "1\n\n2", today_steps_ru: "a",
        tags_kk: "", tags_ru: "t", sources: "s1\ns2", role: "admin", id: "evil",
      }),
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.row).toMatchObject({ slug: "hello-world", status: "published", reading_time: 60, today_steps_kk: ["1", "2"], sources: ["s1", "s2"] });
      expect(ok.row).not.toHaveProperty("role");
      expect(ok.row).not.toHaveProperty("id");
    }
    const bad = buildRow(resources.articles, form({ slug: "not a slug!", title_kk: "", title_ru: "" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors).toEqual(expect.arrayContaining(["slug", "title_kk", "title_ru"]));
  });

  it("parses JSON config and rejects broken JSON; keeps only valid topic ids", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const base = { slug: "x", type: "breathing", status: "published", title_kk: "a", title_ru: "b" };
    const good = buildRow(resources.exercises, form({ ...base, config: '{"cycles":4}', topics: [id, "nope"] }));
    expect(good.ok && good.row.config).toEqual({ cycles: 4 });
    expect(good.ok && good.links).toEqual([id]);
    expect(buildRow(resources.exercises, form({ ...base, config: "{oops" })).ok).toBe(false);
  });
});

describe("test editor validation", () => {
  const payload = (t: (typeof tests)[number]) => ({
    slug: t.slug,
    topic_id: null,
    title_kk: t.title.kk,
    title_ru: t.title.ru,
    description_kk: t.description.kk,
    description_ru: t.description.ru,
    duration_min: t.durationMin,
    status: "published" as const,
    questions: t.questions.map((q) => ({
      text_kk: q.text.kk,
      text_ru: q.text.ru,
      sensitive: q.sensitive === true,
      options: q.options.map((o) => ({ weight: o.weight, label_kk: o.label.kk, label_ru: o.label.ru, ...(o.alert ? { alert: true } : {}) })),
    })),
    thresholds: t.thresholds.map((th) => ({
      level: th.level, min: th.min, max: th.max,
      title_kk: th.title.kk, title_ru: th.title.ru, summary_kk: th.summary.kk, summary_ru: th.summary.ru,
      recommendations_kk: th.recommendations.kk, recommendations_ru: th.recommendations.ru,
      exercise_slugs: th.exerciseSlugs, specialist_kk: th.specialist.kk, specialist_ru: th.specialist.ru,
    })),
  });

  it("accepts every bundled test", () => {
    for (const t of tests) {
      const parsed = testPayloadSchema.safeParse(payload(t));
      expect(parsed.success, t.slug).toBe(true);
      if (parsed.success) expect(checkTestPayload(parsed.data).problems, t.slug).toEqual([]);
    }
  });

  it("reports gaps in score coverage, missing alert options and wrong recommendation counts", () => {
    const p = payload(tests[0]);
    p.thresholds[1].min += 2;
    p.questions[7].options.forEach((o) => delete (o as { alert?: boolean }).alert);
    p.thresholds[0].recommendations_ru = ["only one"];
    const parsed = testPayloadSchema.parse(p);
    const { problems } = checkTestPayload(parsed);
    expect(problems).toEqual(expect.arrayContaining(["thresholds", "needAlert", "needReco"]));
  });
});

describe("encryption", () => {
  it("round-trips, binds data to its owner and detects tampering", async () => {
    process.env.APP_ENCRYPTION_KEYS = `v2:${Buffer.alloc(32, 7).toString("base64")},v1:${Buffer.alloc(32, 9).toString("base64")}`;
    const { decryptJson, encryptJson, resetKeyCacheForTests } = await import("@/lib/crypto");
    resetKeyCacheForTests();
    const secret = { cause: "экзамен", thought: "қорқамын", note: "🙂" };
    const token = encryptJson(secret, "user-a", "diary");

    expect(token.startsWith("v2.")).toBe(true);
    expect(token).not.toContain("экзамен");
    expect(decryptJson(token, "user-a", "diary")).toEqual(secret);
    expect(() => decryptJson(token, "user-b", "diary")).toThrow(); // copied to another account
    expect(() => decryptJson(token, "user-a", "test-answers")).toThrow(); // moved to another column
    const [v, iv, tag, ct] = token.split(".");
    const flipped = `${v}.${iv}.${tag}.${(ct[0] === "A" ? "B" : "A") + ct.slice(1)}`;
    expect(() => decryptJson(flipped, "user-a", "diary")).toThrow();
    expect(encryptJson(secret, "user-a", "diary")).not.toBe(token); // fresh IV every time

    // A value written under an older key still decrypts after rotation.
    process.env.APP_ENCRYPTION_KEYS = `v1:${Buffer.alloc(32, 9).toString("base64")}`;
    resetKeyCacheForTests();
    const old = encryptJson(secret, "u", "diary");
    process.env.APP_ENCRYPTION_KEYS = `v2:${Buffer.alloc(32, 7).toString("base64")},v1:${Buffer.alloc(32, 9).toString("base64")}`;
    resetKeyCacheForTests();
    expect(decryptJson(old, "u", "diary")).toEqual(secret);
  });
});

describe("seed.sql", () => {
  it("applies cleanly on top of the migration, twice, and reads back as the bundled content", async () => {
    const db = new PGlite();
    await db.exec(`
      create schema auth; create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create table auth.users (id uuid primary key default gen_random_uuid(), email varchar(255), raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    `);
    const dir = path.resolve(__dirname, "../supabase/migrations");
    for (const f of fs.readdirSync(dir).sort()) await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));

    const seed = generateSeed();
    await db.exec(seed);
    await db.exec(seed); // idempotent

    const count = async (table: string) => (await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0].n;
    expect(await count("topics")).toBe(7);
    expect(await count("tests")).toBe(7);
    expect(await count("articles")).toBe(14);
    expect(await count("exercises")).toBe(6);
    expect(await count("help_contacts")).toBe(2);
    expect(await count("test_questions")).toBe(tests.reduce((n, t) => n + t.questions.length, 0));

    // Reading a test back the way the app does yields the bundled test.
    const { rows } = await db.query<Record<string, unknown>>(
      "select t.*, to_jsonb(tp) as topics from public.tests t join public.topics tp on tp.id = t.topic_id where t.slug = 'self-esteem'",
    );
    const questions = (await db.query("select * from public.test_questions where test_id = $1", [rows[0].id])).rows;
    const test = testFromRow({ ...rows[0], test_questions: questions });
    const original = tests.find((t) => t.slug === "self-esteem")!;
    expect(test.thresholds).toEqual(original.thresholds);
    expect(test.questions.map((q) => q.text)).toEqual(original.questions.map((q) => q.text));
    expect(test.questions.filter((q) => q.sensitive)).toHaveLength(1);
    expect(topics.length).toBe(7);

    // The migration's public-read rules expose seeded content to anonymous visitors.
    await db.exec("begin; set local role anon");
    expect((await db.query("select 1 from public.articles")).rows).toHaveLength(14);
    await db.exec("rollback");
    await db.close();
  });
});
