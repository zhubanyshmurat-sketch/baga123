/**
 * Row level security tests. They run the real migration against PGlite (Postgres compiled
 * to WASM), with a minimal stand-in for Supabase's `auth` schema and API roles, so no Docker
 * or cloud project is needed.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = process.env.RLS_MIGRATIONS_DIR ?? path.resolve(__dirname, "../migrations");

const SUPABASE_STUB = `
  create schema auth;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email varchar(255),
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const ids = {
  alice: "00000000-0000-0000-0000-00000000000a",
  bob: "00000000-0000-0000-0000-00000000000b",
  editor: "00000000-0000-0000-0000-0000000000e1",
  admin: "00000000-0000-0000-0000-0000000000ad",
};
type Who = keyof typeof ids | "anon";

let db: PGlite;

/** Runs `fn` inside a transaction as an API role/user, then rolls back. */
async function as<T>(who: Who, fn: (db: PGlite) => Promise<T>): Promise<T> {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${who === "anon" ? "anon" : "authenticated"}`);
    if (who !== "anon") {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[who]]);
    }
    return await fn(db);
  } finally {
    await db.exec("rollback");
  }
}

const rows = (who: Who, sql: string, params: unknown[] = []) =>
  as(who, async (d) => (await d.query(sql, params)).rows as Record<string, unknown>[]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of fs.readdirSync(MIGRATIONS).sort()) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS, file), "utf8"));
  }

  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ids.alice}', 'alice@example.com', '{"consent":"true","display_name":"Alice","language":"ru"}'),
      ('${ids.bob}', 'bob@example.com', '{}'),
      ('${ids.editor}', 'editor@example.com', '{}'),
      ('${ids.admin}', 'admin@example.com', '{}');
    update public.profiles set role = 'editor' where id = '${ids.editor}';
    update public.profiles set role = 'admin' where id = '${ids.admin}';

    insert into public.topics (slug, title_kk, title_ru) values ('anxiety', 'Алаңдаушылық', 'Тревога');
    insert into public.articles (slug, title_kk, title_ru, status, topic_id)
      select 'pub', 'a', 'a', 'published', id from public.topics where slug = 'anxiety';
    insert into public.articles (slug, title_kk, title_ru, status)
      values ('draft', 'b', 'b', 'draft');
    insert into public.tests (slug, title_kk, title_ru, status) values
      ('t-pub', 'x', 'x', 'published'), ('t-draft', 'y', 'y', 'draft');
    insert into public.test_questions (test_id, text_kk, text_ru, options)
      select id, 'q', 'q', '[]' from public.tests;
    insert into public.help_contacts (name_kk, name_ru, phone, is_active) values
      ('on', 'on', '112', true), ('off', 'off', '000', false);

    insert into public.mood_entries (user_id, mood, entry_date) values
      ('${ids.alice}', 4, '2026-10-20'), ('${ids.bob}', 2, '2026-10-20');
    insert into public.emotion_diary (user_id, emotion, intensity, payload_enc) values
      ('${ids.alice}', 'anxiety', 7, 'v1.secret-a'), ('${ids.bob}', 'sadness', 5, 'v1.secret-b');
    insert into public.test_results (user_id, test_id, score, max_score, level, answers_enc)
      select '${ids.alice}', id, 5, 24, 'low', 'v1.x' from public.tests where slug = 't-pub';
    insert into public.favorites (user_id, item_type, item_slug) values ('${ids.bob}', 'article', 'pub');
    insert into public.planner_tasks (user_id, title, quadrant) values ('${ids.bob}', 'secret task', 1);
    insert into public.exercise_sessions (user_id, exercise_slug, practiced_on) values ('${ids.bob}', 'breathing-478', '2026-09-09');
  `);
});

afterAll(async () => {
  await db.close();
});

describe("public content", () => {
  it("anonymous visitors read published articles but not drafts", async () => {
    const r = await rows("anon", "select slug from public.articles order by slug");
    expect(r.map((x) => x.slug)).toEqual(["pub"]);
  });

  it("anonymous visitors read published tests and their questions only", async () => {
    expect((await rows("anon", "select slug from public.tests")).map((x) => x.slug)).toEqual(["t-pub"]);
    expect(await rows("anon", "select id from public.test_questions")).toHaveLength(1);
  });

  it("anonymous visitors only see active help contacts", async () => {
    const r = await rows("anon", "select phone from public.help_contacts");
    expect(r.map((x) => x.phone)).toEqual(["112"]);
  });

  it("anonymous visitors cannot write content", async () => {
    await expect(
      as("anon", (d) => d.query("insert into public.topics (slug, title_kk, title_ru) values ('x','x','x')")),
    ).rejects.toThrow(/permission denied/i);
  });

  it("students cannot write content", async () => {
    await expect(
      as("alice", (d) => d.query("insert into public.topics (slug, title_kk, title_ru) values ('x','x','x')")),
    ).rejects.toThrow(/row-level security|permission denied/i);
    const updated = await as("alice", async (d) =>
      (await d.query("update public.articles set title_ru = 'hacked' returning id")).rows,
    );
    expect(updated).toHaveLength(0);
  });
});

describe("editors and admins", () => {
  it("editors see drafts and can write articles", async () => {
    expect(await rows("editor", "select slug from public.articles")).toHaveLength(2);
    const inserted = await as("editor", async (d) =>
      (await d.query("insert into public.articles (slug, title_kk, title_ru) values ('new','n','n') returning slug")).rows,
    );
    expect(inserted).toHaveLength(1);
  });

  it("editors cannot manage help contacts", async () => {
    await expect(
      as("editor", (d) => d.query("insert into public.help_contacts (name_kk, name_ru, phone) values ('a','a','1')")),
    ).rejects.toThrow(/row-level security/i);
    const upd = await as("editor", async (d) =>
      (await d.query("update public.help_contacts set phone = '999' returning id")).rows,
    );
    expect(upd).toHaveLength(0);
  });

  it("admins manage help contacts and see inactive ones", async () => {
    expect(await rows("admin", "select id from public.help_contacts")).toHaveLength(2);
    const ins = await as("admin", async (d) =>
      (await d.query("insert into public.help_contacts (name_kk, name_ru, phone) values ('a','a','1') returning id")).rows,
    );
    expect(ins).toHaveLength(1);
  });

  it("replace_test_questions swaps questions atomically", async () => {
    const result = await as("editor", async (d) => {
      const { rows: t } = await d.query<{ id: string }>("select id from public.tests where slug = 't-pub'");
      await d.query("select public.replace_test_questions($1, $2::jsonb)", [
        t[0].id,
        JSON.stringify([
          { text_kk: "1", text_ru: "1", options: [{ value: 0, weight: 0 }], is_sensitive: false },
          { text_kk: "2", text_ru: "2", options: [], is_sensitive: true },
        ]),
      ]);
      return (
        await d.query(
          "select text_ru, sort_order, is_sensitive from public.test_questions where test_id = $1 order by sort_order",
          [t[0].id],
        )
      ).rows;
    });
    expect(result).toEqual([
      { text_ru: "1", sort_order: 1, is_sensitive: false },
      { text_ru: "2", sort_order: 2, is_sensitive: true },
    ]);
  });

  it("students cannot replace test questions", async () => {
    const left = await as("alice", async (d) => {
      const { rows: t } = await d.query<{ id: string }>("select id from public.tests where slug = 't-pub'");
      await expect(
        d.query("select public.replace_test_questions($1, $2::jsonb)", [
          t[0].id,
          JSON.stringify([{ text_kk: "x", text_ru: "x", options: [] }]),
        ]),
      ).rejects.toThrow(/row-level security/i);
      return 0;
    });
    expect(left).toBe(0);
    // The failed attempt did not remove the existing question (checked outside the aborted transaction).
    const q = await db.query(
      "select count(*)::int as n from public.test_questions q join public.tests t on t.id = q.test_id where t.slug = 't-pub'",
    );
    expect(q.rows[0]).toEqual({ n: 1 });
  });
});

describe("personal data isolation", () => {
  const tables = [
    "mood_entries",
    "emotion_diary",
    "test_results",
    "exercise_sessions",
    "favorites",
    "planner_tasks",
  ];

  it.each(tables)("%s: a user sees only their own rows", async (table) => {
    const alice = await rows("alice", `select user_id from public.${table}`);
    const bob = await rows("bob", `select user_id from public.${table}`);
    for (const r of alice) expect(r.user_id).toBe(ids.alice);
    for (const r of bob) expect(r.user_id).toBe(ids.bob);
  });

  it("alice cannot read bob's diary ciphertext", async () => {
    const r = await rows("alice", "select payload_enc from public.emotion_diary");
    expect(r.map((x) => x.payload_enc)).toEqual(["v1.secret-a"]);
  });

  it("admins and editors have no access to personal records", async () => {
    for (const who of ["admin", "editor"] as const) {
      for (const table of tables) {
        expect(await rows(who, `select 1 from public.${table}`)).toHaveLength(0);
      }
    }
  });

  it("anonymous visitors cannot touch personal tables", async () => {
    for (const table of tables) {
      await expect(rows("anon", `select 1 from public.${table}`)).rejects.toThrow(/permission denied/i);
    }
  });

  it("a user cannot insert a row on behalf of someone else", async () => {
    await expect(
      as("alice", (d) =>
        d.query("insert into public.mood_entries (user_id, mood, entry_date) values ($1, 1, '2026-10-21')", [ids.bob]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("a user cannot move their row to another account", async () => {
    await expect(
      as("alice", (d) => d.query("update public.mood_entries set user_id = $1", [ids.bob])),
    ).rejects.toThrow(/row-level security/i);
  });

  it("a user cannot update or delete someone else's rows", async () => {
    const r = await as("alice", async (d) => {
      const u = await d.query("update public.planner_tasks set title = 'pwned' returning id");
      const del = await d.query("delete from public.emotion_diary where user_id = $1 returning id", [ids.bob]);
      return [u.rows.length, del.rows.length];
    });
    expect(r).toEqual([0, 0]);
  });

  it("only one mood entry per user per day", async () => {
    await expect(
      as("alice", (d) =>
        d.query("insert into public.mood_entries (user_id, mood, entry_date) values ($1, 3, '2026-10-20')", [ids.alice]),
      ),
    ).rejects.toThrow(/duplicate key/i);
  });

  it("practice_days lists only the caller's own days", async () => {
    const days = async (who: Who) =>
      (await rows(who, "select day::text as day from public.practice_days('2026-01-01')")).map((x) => x.day);
    const alice = await days("alice");
    const bob = await days("bob");
    expect(alice).toContain("2026-10-20");
    expect(alice).not.toContain("2026-09-09");
    expect(bob).toContain("2026-09-09");
  });
});

describe("profiles and roles", () => {
  it("a profile with consent is created on sign-up", async () => {
    const r = await rows("alice", "select display_name, language, consent_at, role from public.profiles");
    expect(r).toHaveLength(1);
    expect(r[0].display_name).toBe("Alice");
    expect(r[0].language).toBe("ru");
    expect(r[0].consent_at).not.toBeNull();
    expect(r[0].role).toBe("student");
  });

  it("a profile without consent has no consent timestamp until recorded", async () => {
    const before = await rows("bob", "select consent_at from public.profiles");
    expect(before[0].consent_at).toBeNull();
    const after = await as("bob", async (d) => {
      await d.query("select public.record_consent('2')");
      return (await d.query<{ consent_at: string | null; consent_version: string }>("select consent_at, consent_version from public.profiles")).rows;
    });
    expect(after[0]).toMatchObject({ consent_version: "2" });
    expect(after[0].consent_at).not.toBeNull();
  });

  it("students cannot promote themselves", async () => {
    await expect(
      as("alice", (d) => d.query("update public.profiles set role = 'admin'")),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      as("alice", (d) => d.query("select public.set_user_role($1, 'admin')", [ids.alice])),
    ).rejects.toThrow(/admin only/i);
  });

  it("students can edit their own display name, language and theme", async () => {
    const r = await as("alice", async (d) => {
      await d.query("update public.profiles set display_name = 'Ali', theme = 'dark', language = 'kk'");
      return (await d.query("select display_name, theme, language from public.profiles")).rows;
    });
    expect(r[0]).toEqual({ display_name: "Ali", theme: "dark", language: "kk" });
  });

  it("students cannot read other profiles", async () => {
    const r = await rows("alice", "select id from public.profiles");
    expect(r).toHaveLength(1);
  });

  it("admins can list users and change roles, but not their own", async () => {
    const users = await rows("admin", "select email from public.admin_list_users()");
    expect(users).toHaveLength(4);
    const role = await as("admin", async (d) => {
      await d.query("select public.set_user_role($1, 'editor')", [ids.bob]);
      return (await d.query<{ role: string }>("select role from public.profiles where id = $1", [ids.bob])).rows[0].role;
    });
    expect(role).toBe("editor");
    await expect(
      as("admin", (d) => d.query("select public.set_user_role($1, 'student')", [ids.admin])),
    ).rejects.toThrow(/cannot change own role/i);
  });

  it("students cannot list users", async () => {
    await expect(rows("alice", "select * from public.admin_list_users()")).rejects.toThrow(/admin only/i);
  });
});

describe("account deletion", () => {
  it("delete_my_account removes the user and all of their records", async () => {
    const tmp = "00000000-0000-0000-0000-0000000000ff";
    await db.exec(`
      insert into auth.users (id, email) values ('${tmp}', 'tmp@example.com');
      insert into public.mood_entries (user_id, mood, entry_date) values ('${tmp}', 3, '2026-10-01');
      insert into public.emotion_diary (user_id, emotion, intensity, payload_enc) values ('${tmp}', 'x', 1, 'v1.z');
      insert into public.favorites (user_id, item_type, item_slug) values ('${tmp}', 'topic', 'anxiety');
    `);
    await db.exec("begin");
    await db.exec("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [tmp]);
    await db.exec("select public.delete_my_account()");
    await db.exec("commit");
    await db.exec("reset role");

    for (const table of ["mood_entries", "emotion_diary", "favorites"]) {
      const r = await db.query(`select 1 from public.${table} where user_id = $1`, [tmp]);
      expect(r.rows, table).toHaveLength(0);
    }
    expect((await db.query("select 1 from public.profiles where id = $1", [tmp])).rows).toHaveLength(0);
    expect((await db.query("select 1 from auth.users where id = $1", [tmp])).rows).toHaveLength(0);
    // Other users are untouched.
    expect((await db.query("select 1 from public.mood_entries where user_id = $1", [ids.bob])).rows).toHaveLength(1);
  });

  it("anonymous visitors cannot call delete_my_account", async () => {
    await expect(
      as("anon", (d) => d.query("select public.delete_my_account()")),
    ).rejects.toThrow(/permission denied/i);
  });
});
