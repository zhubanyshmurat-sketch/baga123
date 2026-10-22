/**
 * Declarative description of the content tables the admin panel edits. The same description drives
 * the form (components/admin/ResourceForm), the list pages and the server-side row builder, so a
 * field is defined exactly once. Only plain data lives here: it is shared by server and client.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "select"
  | "checkbox"
  | "lines" // one item per line → text[]
  | "json"
  | "slug"
  | "topic" // select of topics, stores topics.id
  | "topicContent"; // the five sections of a topic page, per language

export interface Field {
  name: string;
  kind: FieldKind;
  /** Key in the `admin.fields` messages. */
  label: string;
  /** Stored as `<name>_kk` and `<name>_ru`. */
  bilingual?: boolean;
  required?: boolean;
  options?: readonly string[];
  hint?: string;
  rows?: number;
  min?: number;
  max?: number;
  /** For `lines` fields stored as a jsonb array instead of text[]. */
  jsonArray?: boolean;
}

export type ResourceKey = "topics" | "articles" | "exercises" | "contacts";

export interface Resource {
  key: ResourceKey;
  table: string;
  /** Minimum role allowed to write. */
  role: "editor" | "admin";
  /** Column shown as the row title in lists. */
  titleColumn: string;
  /** Many-to-many link table edited together with the row, if any. */
  links?: { table: string; ownKey: string; otherKey: string; field: string };
  fields: Field[];
}

export const EXERCISE_TYPES = ["breathing", "grounding", "diary", "planner", "pomodoro"] as const;
export const CONTACT_KINDS = ["emergency", "hotline", "university"] as const;
export const STATUSES = ["draft", "published"] as const;

export const resources: Record<ResourceKey, Resource> = {
  topics: {
    key: "topics",
    table: "topics",
    role: "editor",
    titleColumn: "title_ru",
    fields: [
      { name: "slug", kind: "slug", label: "slug", required: true, hint: "slugHint" },
      { name: "icon", kind: "select", label: "icon", options: [] /* filled by the form from ICON_NAMES */ },
      { name: "sort_order", kind: "number", label: "sortOrder", min: 0, max: 999 },
      { name: "title", kind: "text", label: "title", bilingual: true, required: true },
      { name: "description", kind: "textarea", label: "description", bilingual: true, rows: 3 },
      { name: "content", kind: "topicContent", label: "description", bilingual: true },
    ],
  },
  articles: {
    key: "articles",
    table: "articles",
    role: "editor",
    titleColumn: "title_ru",
    fields: [
      { name: "slug", kind: "slug", label: "slug", required: true, hint: "slugHint" },
      { name: "topic_id", kind: "topic", label: "topic" },
      { name: "status", kind: "select", label: "type", options: STATUSES },
      { name: "reading_time", kind: "number", label: "readingTime", min: 1, max: 60 },
      { name: "title", kind: "text", label: "title", bilingual: true, required: true },
      { name: "excerpt", kind: "textarea", label: "excerpt", bilingual: true, rows: 3 },
      { name: "body", kind: "markdown", label: "body", bilingual: true, rows: 22 },
      { name: "today_steps", kind: "lines", label: "todaySteps", bilingual: true, rows: 4 },
      { name: "tags", kind: "lines", label: "tags", bilingual: true, rows: 3 },
      { name: "sources", kind: "lines", label: "sources", rows: 5, jsonArray: true },
    ],
  },
  exercises: {
    key: "exercises",
    table: "exercises",
    role: "editor",
    titleColumn: "title_ru",
    links: { table: "exercise_topics", ownKey: "exercise_id", otherKey: "topic_id", field: "topics" },
    fields: [
      { name: "slug", kind: "slug", label: "slug", required: true, hint: "slugHint" },
      { name: "type", kind: "select", label: "type", options: EXERCISE_TYPES },
      { name: "status", kind: "select", label: "type", options: STATUSES },
      { name: "duration_min", kind: "number", label: "durationMin", min: 1, max: 60 },
      { name: "popular", kind: "checkbox", label: "popular" },
      { name: "title", kind: "text", label: "title", bilingual: true, required: true },
      { name: "description", kind: "textarea", label: "description", bilingual: true, rows: 3 },
      { name: "instructions", kind: "lines", label: "instructions", bilingual: true, rows: 5 },
      { name: "config", kind: "json", label: "config", rows: 5 },
    ],
  },
  contacts: {
    key: "contacts",
    table: "help_contacts",
    role: "admin",
    titleColumn: "name_ru",
    fields: [
      { name: "kind", kind: "select", label: "kind", options: CONTACT_KINDS },
      { name: "phone", kind: "text", label: "phone", required: true },
      { name: "name", kind: "text", label: "name", bilingual: true, required: true },
      { name: "description", kind: "textarea", label: "description", bilingual: true, rows: 2 },
      { name: "hours", kind: "text", label: "hours", bilingual: true },
      { name: "city", kind: "text", label: "city", bilingual: true },
      { name: "sort_order", kind: "number", label: "sortOrder", min: 0, max: 999 },
      { name: "is_active", kind: "checkbox", label: "isActive" },
    ],
  },
};

export function isResourceKey(value: string): value is ResourceKey {
  return value in resources;
}

export const LANGS = ["kk", "ru"] as const;
export type Lang = (typeof LANGS)[number];

export const TOPIC_CONTENT_PARTS = ["what", "signs", "causes", "tips", "specialist"] as const;

type Row = Record<string, unknown>;

const lines = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

const num = (value: FormDataEntryValue | null, field: Field): number | null => {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const lo = field.min ?? -Infinity;
  const hi = field.max ?? Infinity;
  return Math.min(hi, Math.max(lo, Math.round(n)));
};

export type BuildResult = { ok: true; row: Row; links: string[] } | { ok: false; errors: string[] };

/**
 * Turns submitted form data into a database row. Only fields declared on the resource are read,
 * so a crafted request cannot write other columns. Pure, so it is unit-tested.
 */
export function buildRow(resource: Resource, form: FormData): BuildResult {
  const row: Row = {};
  const errors: string[] = [];

  for (const field of resource.fields) {
    const columns = field.bilingual ? LANGS.map((l) => [`${field.name}_${l}`, l] as const) : ([[field.name, null]] as const);

    for (const [column, lang] of columns) {
      const key = lang ? `${field.name}_${lang}` : field.name;
      const raw = form.get(key);

      switch (field.kind) {
        case "text":
        case "textarea":
        case "markdown": {
          const value = String(raw ?? "").trim();
          if (field.required && value === "") errors.push(column);
          row[column] = value;
          break;
        }
        case "slug": {
          const value = String(raw ?? "").trim().toLowerCase();
          if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) errors.push(column);
          row[column] = value;
          break;
        }
        case "number": {
          const value = num(raw, field);
          if (value !== null) row[column] = value;
          break;
        }
        case "select": {
          const value = String(raw ?? "");
          if (field.options && field.options.length > 0 && !field.options.includes(value)) {
            if (field.required) errors.push(column);
          } else {
            row[column] = value;
          }
          break;
        }
        case "checkbox":
          row[column] = raw === "on" || raw === "true";
          break;
        case "topic": {
          const value = String(raw ?? "");
          row[column] = /^[0-9a-f-]{36}$/i.test(value) ? value : null;
          break;
        }
        case "lines": {
          const items = lines(raw);
          row[column] = items; // arrays serialise to both text[] and jsonb
          break;
        }
        case "json": {
          const text = String(raw ?? "").trim();
          if (text === "") {
            row[column] = {};
            break;
          }
          try {
            row[column] = JSON.parse(text);
          } catch {
            errors.push(column);
          }
          break;
        }
        case "topicContent": {
          const l = lang as Lang;
          row[column] = {
            what: String(form.get(`${field.name}_${l}_what`) ?? "").trim(),
            signs: lines(form.get(`${field.name}_${l}_signs`)),
            causes: lines(form.get(`${field.name}_${l}_causes`)),
            tips: lines(form.get(`${field.name}_${l}_tips`)),
            specialist: String(form.get(`${field.name}_${l}_specialist`) ?? "").trim(),
          };
          break;
        }
      }
    }
  }

  const links = resource.links
    ? form.getAll(resource.links.field).map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v))
    : [];

  return errors.length > 0 ? { ok: false, errors } : { ok: true, row, links };
}
