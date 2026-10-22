"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import { saveResourceAction, type SaveState } from "@/lib/admin/actions";
import { LANGS, TOPIC_CONTENT_PARTS, type Field, type Lang, type Resource } from "@/lib/admin/resources";
import { cn } from "@/lib/utils";

export interface TopicOption {
  id: string;
  title: string;
}

interface Props {
  resource: Resource;
  /** Existing row (snake_case columns) or defaults for a new one. */
  initial: Record<string, unknown>;
  id?: string;
  topics: TopicOption[];
  linkedTopicIds: string[];
  iconNames: string[];
}

const inputClass = "w-full rounded-2xl border border-border-strong bg-bg px-4 py-2.5 text-base";
const start: SaveState = { ok: false };

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function ResourceForm({ resource, initial, id, topics, linkedTopicIds, iconNames }: Props) {
  const t = useTranslations("admin");
  const te = useTranslations("exercises");
  const [state, formAction, pending] = useActionState(saveResourceAction.bind(null, resource.key, id ?? ""), start);
  const failed = new Set(state.fields ?? []);

  const labelFor = (field: Field) => (field.name === "status" ? t("status") : t(`fields.${field.label}` as never));

  function optionLabel(field: Field, value: string): string {
    if (field.name === "status") return value === "published" ? t("published") : t("draft");
    if (field.name === "kind") return t(`kinds.${value}` as never);
    if (field.name === "type") return te(`types.${value}` as never);
    return value;
  }

  function renderInput(field: Field, name: string, value: unknown, lang?: Lang) {
    const invalid = failed.has(name);
    const common = {
      id: name,
      name,
      "aria-invalid": invalid || undefined,
      className: cn(inputClass, invalid && "border-coral-strong"),
    };
    const text = asText(value);
    switch (field.kind) {
      case "text":
      case "slug":
        return <input type="text" defaultValue={text} required={field.required} lang={lang} {...common} />;
      case "textarea":
        return <textarea rows={field.rows ?? 3} defaultValue={text} lang={lang} {...common} />;
      case "markdown":
        return (
          <textarea rows={field.rows ?? 16} defaultValue={text} lang={lang} spellCheck {...common} className={cn(common.className, "font-mono text-sm leading-relaxed")} />
        );
      case "lines":
        return <textarea rows={field.rows ?? 4} defaultValue={text} lang={lang} {...common} />;
      case "json":
        return <textarea rows={field.rows ?? 5} defaultValue={text || "{}"} spellCheck={false} {...common} className={cn(common.className, "font-mono text-sm")} />;
      case "number":
        return <input type="number" defaultValue={text} min={field.min} max={field.max} {...common} />;
      case "checkbox":
        return (
          <input
            type="checkbox"
            id={name}
            name={name}
            defaultChecked={Boolean(value)}
            className="size-5 accent-[var(--primary-strong)]"
          />
        );
      case "select": {
        const options = field.name === "icon" ? iconNames : (field.options ?? []);
        return (
          <select defaultValue={text || options[0]} {...common}>
            {options.map((o) => (
              <option key={o} value={o}>
                {optionLabel(field, o)}
              </option>
            ))}
          </select>
        );
      }
      case "topic":
        return (
          <select defaultValue={text} {...common}>
            <option value="">{t("fields.noTopic")}</option>
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {tp.title}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-coral-soft p-4 font-semibold text-coral-strong">
          {t(`errors.${state.error}` as never)}
        </p>
      )}

      {resource.fields.map((field) => {
        if (field.kind === "topicContent") {
          return (
            <div key={field.name} className="grid gap-4 lg:grid-cols-2">
              {LANGS.map((lang) => {
                const content = (initial[`${field.name}_${lang}`] ?? {}) as Record<string, unknown>;
                return (
                  <Card key={lang} className="space-y-4 p-5">
                    <h3 className="font-bold">{t(lang)}</h3>
                    {TOPIC_CONTENT_PARTS.map((part) => {
                      const name = `${field.name}_${lang}_${part}`;
                      const label = part === "specialist" ? t("fields.specialistText") : t(`fields.${part}` as never);
                      return (
                        <div key={part}>
                          <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
                            {label}
                          </label>
                          <textarea
                            id={name}
                            name={name}
                            lang={lang}
                            rows={part === "what" || part === "specialist" ? 4 : 5}
                            defaultValue={asText(content[part])}
                            className={inputClass}
                          />
                        </div>
                      );
                    })}
                  </Card>
                );
              })}
            </div>
          );
        }

        if (field.bilingual) {
          return (
            <div key={field.name} className="grid gap-4 lg:grid-cols-2">
              {LANGS.map((lang) => {
                const name = `${field.name}_${lang}`;
                return (
                  <div key={name}>
                    <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
                      {labelFor(field)} — {t(lang)}
                    </label>
                    {renderInput(field, name, initial[name], lang)}
                  </div>
                );
              })}
            </div>
          );
        }

        return (
          <div key={field.name} className={cn(field.kind === "checkbox" && "flex items-center gap-3")}>
            {field.kind === "checkbox" && renderInput(field, field.name, initial[field.name])}
            <label htmlFor={field.name} className={cn("block text-sm font-semibold", field.kind !== "checkbox" && "mb-1.5")}>
              {labelFor(field)}
            </label>
            {field.kind !== "checkbox" && renderInput(field, field.name, initial[field.name])}
            {field.hint && <p className="mt-1 text-sm text-muted">{t(`fields.${field.hint}` as never)}</p>}
          </div>
        );
      })}

      {resource.links && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t("fields.topics")}</legend>
          <div className="flex flex-wrap gap-2">
            {topics.map((tp) => (
              <label
                key={tp.id}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input
                  type="checkbox"
                  name={resource.links!.field}
                  value={tp.id}
                  defaultChecked={linkedTopicIds.includes(tp.id)}
                  className="size-4 accent-[var(--primary-strong)]"
                />
                {tp.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {t("save")}
        </Button>
        <Link
          href={`/admin/${resource.key}`}
          className="inline-flex min-h-12 items-center rounded-full px-6 font-semibold hover:bg-surface-2"
        >
          {t("back")}
        </Link>
      </div>
    </form>
  );
}
