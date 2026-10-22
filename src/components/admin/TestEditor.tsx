"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import { saveTestAction } from "@/lib/admin/actions";
import {
  checkTestPayload,
  testPayloadSchema,
  type TestPayload,
} from "@/lib/admin/test-schema";
import { LEVELS } from "@/lib/content/types";
import type { TopicOption } from "./ResourceForm";

interface EditorOption {
  weight: number;
  label_kk: string;
  label_ru: string;
  alert: boolean;
}
interface EditorQuestion {
  text_kk: string;
  text_ru: string;
  sensitive: boolean;
  options: EditorOption[];
}
interface EditorThreshold {
  level: string;
  min: number;
  max: number;
  title_kk: string;
  title_ru: string;
  summary_kk: string;
  summary_ru: string;
  recommendations_kk: string;
  recommendations_ru: string;
  exercise_slugs: string;
  specialist_kk: string;
  specialist_ru: string;
}
export interface EditorState {
  slug: string;
  topic_id: string;
  title_kk: string;
  title_ru: string;
  description_kk: string;
  description_ru: string;
  duration_min: number;
  status: "draft" | "published";
  questions: EditorQuestion[];
  thresholds: EditorThreshold[];
}

const SCALES = {
  frequency: [
    ["Ешқашан", "Никогда"],
    ["Кейде", "Иногда"],
    ["Жиі", "Часто"],
    ["Әрдайым дерлік", "Почти всегда"],
  ],
  agreement: [
    ["Мүлде келіспеймін", "Совсем не согласен(на)"],
    ["Көбіне келіспеймін", "Скорее не согласен(на)"],
    ["Көбіне келісемін", "Скорее согласен(на)"],
    ["Толық келісемін", "Полностью согласен(на)"],
  ],
} as const;

const inputClass = "w-full rounded-xl border border-border-strong bg-bg px-3 py-2 text-base";
const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

function toPayload(s: EditorState): unknown {
  return {
    slug: s.slug,
    topic_id: s.topic_id || null,
    title_kk: s.title_kk,
    title_ru: s.title_ru,
    description_kk: s.description_kk,
    description_ru: s.description_ru,
    duration_min: s.duration_min,
    status: s.status,
    questions: s.questions.map((q) => ({
      text_kk: q.text_kk,
      text_ru: q.text_ru,
      sensitive: q.sensitive,
      options: q.options.map((o) => ({
        weight: o.weight,
        label_kk: o.label_kk,
        label_ru: o.label_ru,
        ...(q.sensitive && o.alert ? { alert: true } : {}),
      })),
    })),
    thresholds: s.thresholds.map((t) => ({
      ...t,
      recommendations_kk: lines(t.recommendations_kk),
      recommendations_ru: lines(t.recommendations_ru),
      exercise_slugs: lines(t.exercise_slugs),
    })),
  };
}

const emptyQuestion = (): EditorQuestion => ({
  text_kk: "",
  text_ru: "",
  sensitive: false,
  options: SCALES.frequency.map(([kk, ru], weight) => ({ weight, label_kk: kk, label_ru: ru, alert: false })),
});

const emptyThreshold = (level: string, min: number, max: number): EditorThreshold => ({
  level,
  min,
  max,
  title_kk: "",
  title_ru: "",
  summary_kk: "",
  summary_ru: "",
  recommendations_kk: "",
  recommendations_ru: "",
  exercise_slugs: "",
  specialist_kk: "",
  specialist_ru: "",
});

export function newTestState(): EditorState {
  return {
    slug: "",
    topic_id: "",
    title_kk: "",
    title_ru: "",
    description_kk: "",
    description_ru: "",
    duration_min: 3,
    status: "draft",
    questions: [emptyQuestion()],
    thresholds: [emptyThreshold("low", 0, 0), emptyThreshold("medium", 1, 1), emptyThreshold("high", 2, 3)],
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function TestEditor({ id, initial, topics }: { id?: string; initial: EditorState; topics: TopicOption[] }) {
  const t = useTranslations("admin");
  const tt = useTranslations("admin.tests");
  const [state, setState] = useState<EditorState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const payload = useMemo(() => toPayload(state), [state]);
  const check = useMemo(() => {
    const parsed = testPayloadSchema.safeParse(payload);
    if (!parsed.success) return { schemaOk: false as const, problems: [], details: [], min: 0, max: 0 };
    return { schemaOk: true as const, ...checkTestPayload(parsed.data as TestPayload) };
  }, [payload]);
  const canSave = check.schemaOk && check.problems.length === 0;

  const patch = (p: Partial<EditorState>) => setState((s) => ({ ...s, ...p }));
  const patchQuestion = (i: number, p: Partial<EditorQuestion>) =>
    setState((s) => ({ ...s, questions: s.questions.map((q, k) => (k === i ? { ...q, ...p } : q)) }));
  const patchOption = (qi: number, oi: number, p: Partial<EditorOption>) =>
    setState((s) => ({
      ...s,
      questions: s.questions.map((q, k) =>
        k === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, ...p } : o)) } : q,
      ),
    }));
  const patchThreshold = (i: number, p: Partial<EditorThreshold>) =>
    setState((s) => ({ ...s, thresholds: s.thresholds.map((th, k) => (k === i ? { ...th, ...p } : th)) }));
  const move = <T,>(list: T[], from: number, to: number) => {
    if (to < 0 || to >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  };

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveTestAction(id ?? "", JSON.stringify(payload));
      // On success the action redirects, so reaching this point means it failed.
      if (!result.ok) setError(t(`errors.${result.error ?? "generic"}` as never));
    });
  }

  return (
    <div className="space-y-8">
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label={t("fields.slug")}>
          <input className={inputClass} value={state.slug} onChange={(e) => patch({ slug: e.target.value })} />
        </Field>
        <Field label={t("fields.topic")}>
          <select className={inputClass} value={state.topic_id} onChange={(e) => patch({ topic_id: e.target.value })}>
            <option value="">{t("fields.noTopic")}</option>
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {tp.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${t("fields.title")} — ${t("kk")}`}>
          <input lang="kk" className={inputClass} value={state.title_kk} onChange={(e) => patch({ title_kk: e.target.value })} />
        </Field>
        <Field label={`${t("fields.title")} — ${t("ru")}`}>
          <input lang="ru" className={inputClass} value={state.title_ru} onChange={(e) => patch({ title_ru: e.target.value })} />
        </Field>
        <Field label={`${t("fields.description")} — ${t("kk")}`}>
          <textarea lang="kk" rows={2} className={inputClass} value={state.description_kk} onChange={(e) => patch({ description_kk: e.target.value })} />
        </Field>
        <Field label={`${t("fields.description")} — ${t("ru")}`}>
          <textarea lang="ru" rows={2} className={inputClass} value={state.description_ru} onChange={(e) => patch({ description_ru: e.target.value })} />
        </Field>
        <Field label={t("fields.durationMin")}>
          <input type="number" min={1} max={30} className={inputClass} value={state.duration_min} onChange={(e) => patch({ duration_min: Number(e.target.value) })} />
        </Field>
        <Field label={t("status")}>
          <select className={inputClass} value={state.status} onChange={(e) => patch({ status: e.target.value as "draft" | "published" })}>
            <option value="draft">{t("draft")}</option>
            <option value="published">{t("published")}</option>
          </select>
        </Field>
      </Card>

      <section aria-labelledby="questions-h">
        <h2 id="questions-h" className="mb-3 text-xl font-bold">
          {tt("questions")} <span className="text-muted">({state.questions.length})</span>
        </h2>
        <div className="space-y-4">
          {state.questions.map((q, qi) => (
            <Card key={qi} className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">{qi + 1}</h3>
                <div className="flex gap-1">
                  <button type="button" aria-label={tt("moveUp")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2" onClick={() => patch({ questions: move(state.questions, qi, qi - 1) })}>
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={tt("moveDown")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2" onClick={() => patch({ questions: move(state.questions, qi, qi + 1) })}>
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={tt("removeQuestion")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-coral-soft" onClick={() => patch({ questions: state.questions.filter((_, k) => k !== qi) })}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`${tt("questionText")} — ${t("kk")}`}>
                  <textarea lang="kk" rows={2} className={inputClass} value={q.text_kk} onChange={(e) => patchQuestion(qi, { text_kk: e.target.value })} />
                </Field>
                <Field label={`${tt("questionText")} — ${t("ru")}`}>
                  <textarea lang="ru" rows={2} className={inputClass} value={q.text_ru} onChange={(e) => patchQuestion(qi, { text_ru: e.target.value })} />
                </Field>
              </div>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="size-5 accent-[var(--primary-strong)]" checked={q.sensitive} onChange={(e) => patchQuestion(qi, { sensitive: e.target.checked })} />
                <span className="font-semibold">{tt("sensitive")}</span>
              </label>
              {q.sensitive && <p className="text-sm text-muted">{tt("alertOptionHint")}</p>}

              <div>
                <p className="mb-2 text-sm font-semibold">{tt("options")}</p>
                <div className="space-y-2">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="grid grid-cols-[4.5rem_1fr_1fr_auto] items-end gap-2">
                      <Field label={tt("weight")}>
                        <input type="number" min={0} max={20} className={inputClass} value={o.weight} onChange={(e) => patchOption(qi, oi, { weight: Number(e.target.value) })} />
                      </Field>
                      <Field label={`${tt("optionLabel")} (${t("kk")})`}>
                        <input lang="kk" className={inputClass} value={o.label_kk} onChange={(e) => patchOption(qi, oi, { label_kk: e.target.value })} />
                      </Field>
                      <Field label={`${tt("optionLabel")} (${t("ru")})`}>
                        <input lang="ru" className={inputClass} value={o.label_ru} onChange={(e) => patchOption(qi, oi, { label_ru: e.target.value })} />
                      </Field>
                      <div className="flex items-center gap-1 pb-1">
                        {q.sensitive && (
                          <label className="flex min-h-11 items-center gap-1.5 text-sm font-semibold">
                            <input type="checkbox" className="size-4 accent-[var(--primary-strong)]" checked={o.alert} onChange={(e) => patchOption(qi, oi, { alert: e.target.checked })} />
                            {tt("alertOption")}
                          </label>
                        )}
                        <button type="button" aria-label={tt("removeQuestion")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-coral-soft" onClick={() => patchQuestion(qi, { options: q.options.filter((_, k) => k !== oi) })}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => patchQuestion(qi, { options: [...q.options, { weight: q.options.length, label_kk: "", label_ru: "", alert: false }] })}>
                    <Plus className="size-4" aria-hidden="true" />
                    {tt("addOption")}
                  </Button>
                  {(["frequency", "agreement"] as const).map((scale) => (
                    <Button
                      key={scale}
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patchQuestion(qi, {
                          options: SCALES[scale].map(([kk, ru], weight) => ({ weight, label_kk: kk, label_ru: ru, alert: false })),
                        })
                      }
                    >
                      {scale === "frequency" ? tt("scaleFrequency") : tt("scaleAgreement")}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const top = Math.max(...q.options.map((o) => o.weight));
                      patchQuestion(qi, { options: q.options.map((o) => ({ ...o, weight: top - o.weight })) });
                    }}
                  >
                    {tt("reverseWeights")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Button variant="secondary" className="mt-4" onClick={() => patch({ questions: [...state.questions, emptyQuestion()] })}>
          <Plus className="size-4" aria-hidden="true" />
          {tt("addQuestion")}
        </Button>
      </section>

      <section aria-labelledby="thresholds-h">
        <h2 id="thresholds-h" className="mb-1 text-xl font-bold">
          {tt("thresholds")}
        </h2>
        {check.schemaOk && check.max > 0 && (
          <p className="mb-3 text-sm text-muted">{tt("scoreRange", { min: check.min, max: check.max })}</p>
        )}
        <div className="space-y-4">
          {state.thresholds.map((th, i) => (
            <Card key={i} className="space-y-3 p-5">
              <div className="flex flex-wrap items-end gap-3">
                <Field label={tt("level")}>
                  <select className={inputClass} value={th.level} onChange={(e) => patchThreshold(i, { level: e.target.value })}>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={tt("min")}>
                  <input type="number" min={0} className={`${inputClass} w-24`} value={th.min} onChange={(e) => patchThreshold(i, { min: Number(e.target.value) })} />
                </Field>
                <Field label={tt("max")}>
                  <input type="number" min={0} className={`${inputClass} w-24`} value={th.max} onChange={(e) => patchThreshold(i, { max: Number(e.target.value) })} />
                </Field>
                <button type="button" aria-label={tt("removeQuestion")} className="mb-0.5 inline-flex size-11 items-center justify-center rounded-full hover:bg-coral-soft" onClick={() => patch({ thresholds: state.thresholds.filter((_, k) => k !== i) })}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`${tt("levelTitle")} — ${t("kk")}`}>
                  <input lang="kk" className={inputClass} value={th.title_kk} onChange={(e) => patchThreshold(i, { title_kk: e.target.value })} />
                </Field>
                <Field label={`${tt("levelTitle")} — ${t("ru")}`}>
                  <input lang="ru" className={inputClass} value={th.title_ru} onChange={(e) => patchThreshold(i, { title_ru: e.target.value })} />
                </Field>
                <Field label={`${tt("summary")} — ${t("kk")}`}>
                  <textarea lang="kk" rows={4} className={inputClass} value={th.summary_kk} onChange={(e) => patchThreshold(i, { summary_kk: e.target.value })} />
                </Field>
                <Field label={`${tt("summary")} — ${t("ru")}`}>
                  <textarea lang="ru" rows={4} className={inputClass} value={th.summary_ru} onChange={(e) => patchThreshold(i, { summary_ru: e.target.value })} />
                </Field>
                <Field label={`${tt("recommendations")} — ${t("kk")}`}>
                  <textarea lang="kk" rows={4} className={inputClass} value={th.recommendations_kk} onChange={(e) => patchThreshold(i, { recommendations_kk: e.target.value })} />
                </Field>
                <Field label={`${tt("recommendations")} — ${t("ru")}`}>
                  <textarea lang="ru" rows={4} className={inputClass} value={th.recommendations_ru} onChange={(e) => patchThreshold(i, { recommendations_ru: e.target.value })} />
                </Field>
                <Field label={`${tt("specialist")} — ${t("kk")}`}>
                  <textarea lang="kk" rows={3} className={inputClass} value={th.specialist_kk} onChange={(e) => patchThreshold(i, { specialist_kk: e.target.value })} />
                </Field>
                <Field label={`${tt("specialist")} — ${t("ru")}`}>
                  <textarea lang="ru" rows={3} className={inputClass} value={th.specialist_ru} onChange={(e) => patchThreshold(i, { specialist_ru: e.target.value })} />
                </Field>
              </div>
              <Field label={tt("exerciseSlugs")}>
                <textarea rows={2} className={inputClass} value={th.exercise_slugs} onChange={(e) => patchThreshold(i, { exercise_slugs: e.target.value })} />
              </Field>
            </Card>
          ))}
        </div>
        <Button variant="secondary" className="mt-4" onClick={() => patch({ thresholds: [...state.thresholds, emptyThreshold("medium", 0, 0)] })}>
          <Plus className="size-4" aria-hidden="true" />
          {tt("addThreshold")}
        </Button>
      </section>

      <div className="sticky bottom-20 z-30 rounded-card border border-border bg-surface p-4 shadow-soft lg:bottom-4">
        {!canSave && (
          <div className="mb-3 text-sm" role="status" aria-live="polite">
            <p className="font-semibold text-coral-strong">{tt("problemsTitle")}</p>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {check.problems.map((p) => (
                <li key={p}>{p === "thresholds" ? check.details.join("; ") : tt(p as never)}</li>
              ))}
              {!check.schemaOk && <li>{t("errors.invalid")}</li>}
            </ul>
          </div>
        )}
        {error && (
          <p role="alert" className="mb-3 font-semibold text-coral-strong">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button size="lg" disabled={!canSave || pending} onClick={save}>
            {t("save")}
          </Button>
          <Link href="/admin/tests" className="inline-flex min-h-12 items-center rounded-full px-6 font-semibold hover:bg-surface-2">
            {t("back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
