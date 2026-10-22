"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PlannerTask, Quadrant } from "@/lib/personal/types";
import { usePersonalStore, useStoreData } from "@/lib/personal/use-store";
import { cn, newId } from "@/lib/utils";

const QUADRANTS: { id: Quadrant; tone: string }[] = [
  { id: 1, tone: "bg-coral-soft" },
  { id: 2, tone: "bg-primary-soft" },
  { id: 3, tone: "bg-accent-soft" },
  { id: 4, tone: "bg-surface-2" },
];

/** Eisenhower matrix. Tasks move between quadrants by drag and drop or by the "move to" list. */
export function PlannerExercise() {
  const t = useTranslations("exercises.planner");
  const tc = useTranslations("common");
  const store = usePersonalStore();
  const { data, loading } = useStoreData((s) => s.listTasks());

  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saveError, setSaveError] = useState(false);
  const [dragOver, setDragOver] = useState<Quadrant | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef<PlannerTask[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- copies the asynchronously loaded list into editable state
    if (data) setTasks(data);
  }, [data]);

  useEffect(() => {
    latest.current = tasks;
  }, [tasks]);

  // Write pending changes before leaving the page.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void store?.saveTasks(latest.current).catch(() => undefined);
      }
    },
    [store],
  );

  function commit(next: PlannerTask[]) {
    setTasks(next);
    setSaveError(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      store?.saveTasks(next).catch(() => setSaveError(true));
    }, 400);
  }

  function add(quadrant: Quadrant) {
    const title = (drafts[quadrant] ?? "").trim();
    if (!title) return;
    const order = Math.max(0, ...tasks.filter((x) => x.quadrant === quadrant).map((x) => x.order)) + 1;
    commit([...tasks, { id: newId(), title: title.slice(0, 200), quadrant, done: false, order }]);
    setDrafts((d) => ({ ...d, [quadrant]: "" }));
  }

  function move(id: string, quadrant: Quadrant) {
    const order = Math.max(0, ...tasks.filter((x) => x.quadrant === quadrant).map((x) => x.order)) + 1;
    commit(tasks.map((x) => (x.id === id ? { ...x, quadrant, order } : x)));
  }

  const hasDone = tasks.some((x) => x.done);

  return (
    <div>
      <p className="mb-4 text-muted">{t("intro")}</p>
      <p className="mb-6 text-sm text-muted">{t("dragHint")}</p>

      {loading && <p className="text-muted">{tc("loading")}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {QUADRANTS.map(({ id, tone }) => {
          const items = tasks.filter((x) => x.quadrant === id).sort((a, b) => a.order - b.order);
          const title = t(`q${id}`);
          return (
            <section
              key={id}
              aria-labelledby={`quad-${id}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(id);
              }}
              onDragLeave={() => setDragOver((q) => (q === id ? null : q))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) move(taskId, id);
              }}
              className={cn(
                "rounded-card border-2 border-transparent p-4 transition-colors",
                tone,
                dragOver === id && "border-primary-strong",
              )}
            >
              <h2 id={`quad-${id}`} className="font-bold">
                {title}
              </h2>
              <p className="text-sm text-muted">{t(`q${id}Hint`)}</p>

              <ul className="mt-3 space-y-2">
                {items.length === 0 && <li className="py-2 text-sm text-muted">{t("empty")}</li>}
                {items.map((task) => (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                    className="flex items-center gap-2 rounded-2xl bg-surface p-2 shadow-soft"
                  >
                    <GripVertical className="size-4 shrink-0 cursor-grab text-muted" aria-hidden="true" />
                    <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => commit(tasks.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)))}
                        className="size-5 accent-[var(--primary-strong)]"
                      />
                      <span className="sr-only-text">{t("done")}:</span>
                      <span className={cn(task.done && "text-muted line-through")}>{task.title}</span>
                    </label>
                    <select
                      aria-label={`${t("moveTo")}: ${task.title}`}
                      value={task.quadrant}
                      onChange={(e) => move(task.id, Number(e.target.value) as Quadrant)}
                      className="min-h-11 max-w-[4.5rem] rounded-xl border border-border-strong bg-bg px-1 text-sm"
                    >
                      {QUADRANTS.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.id}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => commit(tasks.filter((x) => x.id !== task.id))}
                      aria-label={`${t("remove")}: ${task.title}`}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  add(id);
                }}
              >
                <label htmlFor={`add-${id}`} className="sr-only-text">
                  {t("addTo", { quadrant: title })}
                </label>
                <input
                  id={`add-${id}`}
                  type="text"
                  maxLength={200}
                  value={drafts[id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))}
                  placeholder={t("addPlaceholder")}
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-4"
                />
                <button
                  type="submit"
                  aria-label={t("addTo", { quadrant: title })}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary hover:brightness-95"
                >
                  <Plus className="size-5" aria-hidden="true" />
                </button>
              </form>
            </section>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        {hasDone && (
          <Button variant="secondary" size="sm" onClick={() => commit(tasks.filter((x) => !x.done))}>
            {t("clearDone")}
          </Button>
        )}
        {saveError && (
          <p role="alert" className="text-sm font-medium text-coral-strong">
            {t("saveError")}
          </p>
        )}
      </div>
    </div>
  );
}
