"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MoodFace } from "@/components/ui/MoodFace";
import { Card } from "@/components/ui/Card";
import { MOODS, type Mood } from "@/lib/personal/types";
import { usePersonalStore } from "@/lib/personal/use-store";
import { cn, todayKey } from "@/lib/utils";

/** Five-face mood check-in. One tap saves today's mood; tapping again changes it. */
export function MoodCheckin() {
  const t = useTranslations("home");
  const tm = useTranslations("moods");
  const store = usePersonalStore();
  const [selected, setSelected] = useState<Mood | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!store) return;
    let active = true;
    store
      .getMoods(1)
      .then((entries) => {
        const today = entries.find((e) => e.date === todayKey());
        if (active && today) {
          setSelected(today.mood);
          setSaved(true);
        }
      })
      .catch(() => {
        // Not being able to read today's mood only means the card starts empty.
      });
    return () => {
      active = false;
    };
  }, [store]);

  async function choose(mood: Mood) {
    if (!store) return;
    setSelected(mood);
    setFailed(false);
    try {
      await store.setMood(todayKey(), mood);
      setSaved(true);
      setChanging(false);
    } catch {
      setFailed(true);
      setSaved(false);
    }
  }

  const showPicker = !saved || changing;

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-bold">{t("moodTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("moodHint")}</p>

      {showPicker ? (
        <div
          role="radiogroup"
          aria-label={tm("question")}
          className="mt-5 grid grid-cols-5 gap-2 sm:gap-3"
        >
          {MOODS.map((mood) => {
            const active = selected === mood;
            return (
              <button
                key={mood}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!store}
                onClick={() => choose(mood)}
                className={cn(
                  "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 transition",
                  active
                    ? "animate-pop border-primary bg-primary-soft text-primary-strong"
                    : "border-border bg-bg text-muted hover:border-primary hover:text-fg",
                )}
              >
                <MoodFace mood={mood} size={34} />
                <span className="text-[0.7rem] font-semibold leading-tight sm:text-xs">{tm(`${mood}`)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-primary-soft p-4" role="status">
          {selected && (
            <span className="text-primary-strong">
              <MoodFace mood={selected} size={44} />
            </span>
          )}
          <div className="flex-1">
            <p className="font-semibold">
              {selected && t("moodSaved", { mood: tm(`${selected}`) })}
            </p>
            {store?.kind === "local" && <p className="mt-1 text-sm text-muted">{t("moodSavedGuest")}</p>}
          </div>
        </div>
      )}

      {failed && (
        <p role="alert" className="mt-3 text-sm font-medium text-coral-strong">
          {t("moodError")}
        </p>
      )}

      {saved && !changing && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="min-h-11 text-sm font-semibold text-primary-strong underline underline-offset-4"
          >
            {t("moodChange")}
          </button>
          <Link
            href="/me"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-strong"
          >
            {t("viewProgress")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Card>
  );
}
