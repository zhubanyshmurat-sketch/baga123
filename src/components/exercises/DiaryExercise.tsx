"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreData, usePersonalStore } from "@/lib/personal/use-store";
import { EMOTIONS, type DiaryDraft, type DiaryEntry, type Emotion } from "@/lib/personal/types";
import { cn } from "@/lib/utils";

const emptyDraft: DiaryDraft = { emotion: "calm", intensity: 5, cause: "", thought: "", note: "" };

const fieldClass =
  "w-full rounded-2xl border border-border-strong bg-bg px-4 py-3 text-base placeholder:text-muted";

export function DiaryExercise() {
  const t = useTranslations("exercises.diary");
  const te = useTranslations("emotions");
  const tc = useTranslations("common");
  const format = useFormatter();
  const store = usePersonalStore();
  const { data: entries, loading, error, reload } = useStoreData((s) => s.listDiary());

  const [draft, setDraft] = useState<DiaryDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmId, setConfirmId] = useState<string | undefined>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setFailed(false);
    try {
      await store.saveDiary(draft, editingId);
      setDraft(emptyDraft);
      setEditingId(undefined);
      reload();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function edit(entry: DiaryEntry) {
    setEditingId(entry.id);
    setDraft({
      emotion: entry.emotion,
      intensity: entry.intensity,
      cause: entry.cause,
      thought: entry.thought,
      note: entry.note,
    });
    document.getElementById("diary-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function remove(id: string) {
    if (!store) return;
    try {
      await store.deleteDiary(id);
      setConfirmId(undefined);
      if (editingId === id) {
        setEditingId(undefined);
        setDraft(emptyDraft);
      }
      reload();
    } catch {
      setFailed(true);
    }
  }

  const where = store?.kind === "remote" ? t("whereRemote") : t("whereLocal");

  return (
    <div className="space-y-8">
      <Card className="p-5 sm:p-8">
        <form id="diary-form" onSubmit={submit} className="space-y-6">
          <h2 className="text-xl font-bold">{t("title")}</h2>

          <fieldset>
            <legend className="mb-2 font-semibold">{t("emotion")}</legend>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((emotion: Emotion) => (
                <label
                  key={emotion}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 font-semibold transition",
                    draft.emotion === emotion
                      ? "border-primary bg-primary-soft text-primary-strong"
                      : "border-border-strong hover:border-primary",
                  )}
                >
                  <input
                    type="radio"
                    name="emotion"
                    value={emotion}
                    checked={draft.emotion === emotion}
                    onChange={() => setDraft((d) => ({ ...d, emotion }))}
                    className="sr-only"
                  />
                  {te(emotion)}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="intensity" className="mb-2 block font-semibold">
              {t("intensity", { value: draft.intensity })}
            </label>
            <input
              id="intensity"
              type="range"
              min={1}
              max={10}
              step={1}
              value={draft.intensity}
              onChange={(e) => setDraft((d) => ({ ...d, intensity: Number(e.target.value) }))}
              className="h-11 w-full accent-[var(--primary-strong)]"
            />
            <div className="flex justify-between text-xs text-muted" aria-hidden="true">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          <div>
            <label htmlFor="cause" className="mb-2 block font-semibold">
              {t("cause")}
            </label>
            <textarea
              id="cause"
              rows={3}
              maxLength={2000}
              value={draft.cause}
              placeholder={t("causeHint")}
              onChange={(e) => setDraft((d) => ({ ...d, cause: e.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="thought" className="mb-2 block font-semibold">
              {t("thought")}
            </label>
            <textarea
              id="thought"
              rows={2}
              maxLength={2000}
              value={draft.thought}
              onChange={(e) => setDraft((d) => ({ ...d, thought: e.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="note" className="mb-2 block font-semibold">
              {t("note")} <span className="font-normal text-muted">({tc("optional")})</span>
            </label>
            <textarea
              id="note"
              rows={2}
              maxLength={2000}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              className={fieldClass}
            />
          </div>

          {failed && (
            <p role="alert" className="font-medium text-coral-strong">
              {t("saveError")}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={saving || !store}>
              {saving ? tc("saving") : editingId ? t("update") : t("save")}
            </Button>
            {editingId && (
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setEditingId(undefined);
                  setDraft(emptyDraft);
                }}
              >
                {t("cancelEdit")}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted">{t("privateNote", { where })}</p>
        </form>
      </Card>

      <section aria-labelledby="diary-entries">
        <h2 id="diary-entries" className="mb-4 text-xl font-bold">
          {t("entries")}
        </h2>
        {loading && <p className="text-muted">{tc("loading")}</p>}
        {error && <p role="alert" className="text-coral-strong">{tc("genericError")}</p>}
        {!loading && !error && entries?.length === 0 && (
          <Card className="p-6 text-muted">{t("empty")}</Card>
        )}
        <ul className="space-y-3">
          {entries?.map((entry) => (
            <li key={entry.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary-strong">
                    {te(entry.emotion)}
                  </span>
                  <span className="text-sm font-semibold">{t("intensityShort", { value: entry.intensity })}</span>
                  <time className="text-sm text-muted" dateTime={entry.createdAt}>
                    {format.dateTime(new Date(entry.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => edit(entry)}
                      aria-label={t("editEntry")}
                      title={t("editEntry")}
                      className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    {confirmId === entry.id ? (
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        className="inline-flex min-h-11 items-center rounded-full bg-coral-soft px-4 text-sm font-bold text-coral-strong"
                      >
                        {t("deleteConfirm")} {tc("yes")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(entry.id)}
                        aria-label={t("deleteEntry")}
                        title={t("deleteEntry")}
                        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                {entry.cause && <p className="mt-3">{entry.cause}</p>}
                {entry.thought && <p className="mt-2 italic text-muted">“{entry.thought}”</p>}
                {entry.note && <p className="mt-2 text-sm text-muted">{entry.note}</p>}
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
