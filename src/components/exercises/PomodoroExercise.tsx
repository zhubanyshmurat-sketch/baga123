"use client";

import { Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { beep, unlockAudio } from "@/lib/exercises/audio";
import { usePersonalStore } from "@/lib/personal/use-store";
import { cn, dateKey } from "@/lib/utils";

type Mode = "work" | "short" | "long";

interface Settings {
  workMin: number;
  shortMin: number;
  longMin: number;
  longEvery: number;
}

const DAY_KEY = "sm.pomodoro.day";
const SETTINGS_KEY = "sm.pomodoro.settings";

function readSettings(config: Record<string, unknown>): Settings {
  const fromConfig: Settings = {
    workMin: Number(config.workMin ?? 25),
    shortMin: Number(config.shortMin ?? 5),
    longMin: Number(config.longMin ?? 15),
    longEvery: Number(config.longEvery ?? 4),
  };
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<Settings> | null;
    return stored ? { ...fromConfig, ...stored } : fromConfig;
  } catch {
    return fromConfig;
  }
}

function readCount(): number {
  try {
    const v = JSON.parse(localStorage.getItem(DAY_KEY) ?? "null") as { date: string; count: number } | null;
    return v && v.date === dateKey(new Date()) ? v.count : 0;
  } catch {
    return 0;
  }
}

function writeCount(count: number) {
  try {
    localStorage.setItem(DAY_KEY, JSON.stringify({ date: dateKey(new Date()), count }));
  } catch {
    // Counting is a convenience; ignore blocked storage.
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n) || lo));

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Pomodoro timer. Uses wall-clock timestamps, so it stays accurate when the tab is in the background. */
export function PomodoroExercise({ slug, config }: { slug: string; config: Record<string, unknown> }) {
  const t = useTranslations("exercises.pomodoro");
  const store = usePersonalStore();

  const [settings, setSettings] = useState<Settings>(() => ({
    workMin: Number(config.workMin ?? 25),
    shortMin: Number(config.shortMin ?? 5),
    longMin: Number(config.longMin ?? 15),
    longEvery: Number(config.longEvery ?? 4),
  }));
  const [mode, setMode] = useState<Mode>("work");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(settings.workMin * 60);
  const [count, setCount] = useState(0);
  const [sound, setSound] = useState(true);
  const [finished, setFinished] = useState(false);
  const endAt = useRef(0);

  const secondsFor = useCallback(
    (m: Mode, s: Settings) => (m === "work" ? s.workMin : m === "short" ? s.shortMin : s.longMin) * 60,
    [],
  );

  // Restore saved settings and today's count after mount (they live in localStorage).
  useEffect(() => {
    const s = readSettings(config);
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage is only readable after mount */
    setSettings(s);
    setLeft(s.workMin * 60);
    setCount(readCount());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [config]);

  const advance = useCallback(
    (completedWork: boolean) => {
      let nextMode: Mode = "work";
      let nextCount = count;
      if (mode === "work") {
        if (completedWork) {
          nextCount = count + 1;
          setCount(nextCount);
          writeCount(nextCount);
          void store?.logExercise(slug, settings.workMin * 60).catch(() => undefined);
        }
        nextMode = nextCount > 0 && nextCount % settings.longEvery === 0 ? "long" : "short";
      }
      setMode(nextMode);
      setLeft(secondsFor(nextMode, settings));
      setRunning(false);
    },
    [count, mode, settings, slug, store, secondsFor],
  );

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        if (sound) beep(660, 500);
        setFinished(true);
        advance(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, sound, advance]);

  useEffect(() => {
    const original = document.title;
    if (running) document.title = `${format(left)} · StudentMind`;
    return () => {
      document.title = original;
    };
  }, [running, left]);

  function start() {
    if (sound) unlockAudio();
    setFinished(false);
    endAt.current = Date.now() + left * 1000;
    setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setLeft(secondsFor(mode, settings));
  }

  function updateSetting(key: keyof Settings, value: number, lo: number, hi: number) {
    const next = { ...settings, [key]: clamp(value, lo, hi) };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    if (!running) setLeft(secondsFor(mode, next));
  }

  const total = secondsFor(mode, settings);
  const progress = total > 0 ? 1 - left / total : 0;
  const modes: Mode[] = ["work", "short", "long"];

  return (
    <Card className="p-5 sm:p-8">
      <p className="mb-6 text-muted">{t("intro")}</p>

      <div role="tablist" aria-label={t("timer")} className="mx-auto flex max-w-md gap-1 rounded-full bg-surface-2 p-1">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setRunning(false);
              setMode(m);
              setLeft(secondsFor(m, settings));
            }}
            className={cn(
              "min-h-11 flex-1 rounded-full px-2 text-sm font-semibold transition-colors",
              mode === m ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
            )}
          >
            {t(m)}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-6 flex size-64 items-center justify-center">
        <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" strokeWidth="1.6" className="stroke-surface-2" />
          <circle
            cx="20"
            cy="20"
            r="17"
            fill="none"
            strokeWidth="1.6"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - progress * 100}
            className="stroke-primary-strong transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        <div className="text-center">
          <p className="text-6xl font-extrabold tabular-nums" role="timer" aria-label={t("timer")}>
            {format(left)}
          </p>
          <p className="mt-1 font-semibold text-muted" aria-live="polite">
            {finished && !running ? t("phaseDone") : t(mode)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {running ? (
          <Button size="lg" variant="secondary" onClick={pause}>
            <Pause className="size-5" aria-hidden="true" />
            {t("pause")}
          </Button>
        ) : (
          <Button size="lg" onClick={start}>
            <Play className="size-5" aria-hidden="true" />
            {t("start")}
          </Button>
        )}
        <Button size="lg" variant="ghost" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("reset")}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => advance(false)}>
          <SkipForward className="size-4" aria-hidden="true" />
          {t("skip")}
        </Button>
      </div>

      <p className="mt-5 text-center font-semibold">{t("cyclesToday", { count })}</p>

      <details className="mt-6 rounded-2xl border border-border p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">{t("settings")}</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["workMin", "workMin", 1, 90],
              ["shortMin", "shortMin", 1, 30],
              ["longMin", "longMin", 1, 60],
            ] as const
          ).map(([key, label, lo, hi]) => (
            <div key={key}>
              <label htmlFor={`pomo-${key}`} className="mb-1 block text-sm font-semibold">
                {t(label)}
              </label>
              <input
                id={`pomo-${key}`}
                type="number"
                inputMode="numeric"
                min={lo}
                max={hi}
                value={settings[key]}
                onChange={(e) => updateSetting(key, Number(e.target.value), lo, hi)}
                className="min-h-11 w-full rounded-xl border border-border-strong bg-bg px-3"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={sound}
          onClick={() => setSound((s) => !s)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-4 font-semibold"
        >
          {sound ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          {t("sound")}
        </button>
      </details>
    </Card>
  );
}
