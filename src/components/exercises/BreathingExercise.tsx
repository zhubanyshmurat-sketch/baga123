"use client";

import { Minus, Pause, Play, Plus, RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  PRESETS,
  clampCycles,
  isPreset,
  stateAt,
  totalSeconds,
  MAX_CYCLES,
  MIN_CYCLES,
  type Phase,
  type Preset,
} from "@/lib/exercises/breathing";
import { beep, prefersReducedMotion, unlockAudio } from "@/lib/exercises/audio";
import { usePersonalStore } from "@/lib/personal/use-store";
import { cn } from "@/lib/utils";

type Status = "idle" | "running" | "paused" | "done";

const TONES: Record<Phase, number> = { inhale: 392, holdIn: 466, exhale: 330, holdOut: 466 };

export function BreathingExercise({
  slug,
  config,
}: {
  slug: string;
  config: Record<string, unknown>;
}) {
  const t = useTranslations("exercises.breathing");
  const tex = useTranslations("exercises");
  const store = usePersonalStore();

  const [preset, setPreset] = useState<Preset>(isPreset(config.preset) ? config.preset : "478");
  const [cycles, setCycles] = useState(clampCycles(Number(config.cycles ?? 4)));
  const [sound, setSound] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [view, setView] = useState<{ phase: Phase; secondsLeft: number; cycle: number }>({
    phase: "inhale",
    secondsLeft: PRESETS[preset][0].seconds,
    cycle: 1,
  });

  const frame = useRef(0);
  const startedAt = useRef(0);
  const base = useRef(0);
  const circle = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const lastKey = useRef("");
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  const tickRef = useRef<() => void>(() => undefined);

  const stopLoop = useCallback(() => cancelAnimationFrame(frame.current), []);

  const paint = useCallback((fill: number, progress: number) => {
    if (circle.current && !prefersReducedMotion()) {
      circle.current.style.transform = `scale(${0.5 + 0.5 * fill})`;
    }
    if (ring.current) {
      ring.current.style.strokeDashoffset = String(100 - progress * 100);
    }
  }, []);

  const tick = useCallback(() => {
    const elapsed = base.current + (performance.now() - startedAt.current);
    const s = stateAt(preset, cycles, elapsed);
    paint(s.fill, s.phaseProgress);

    const key = `${s.cycle}-${s.phase}-${s.secondsLeft}`;
    if (key !== lastKey.current) {
      const phaseChanged = !lastKey.current.startsWith(`${s.cycle}-${s.phase}-`);
      lastKey.current = key;
      setView({ phase: s.phase, secondsLeft: s.secondsLeft, cycle: s.cycle });
      if (phaseChanged && soundRef.current && !s.done) beep(TONES[s.phase]);
    }

    if (s.done) {
      setStatus("done");
      if (soundRef.current) beep(523, 400);
      void store?.logExercise(slug, totalSeconds(preset, cycles)).catch(() => undefined);
      return;
    }
    frame.current = requestAnimationFrame(() => tickRef.current());
  }, [preset, cycles, paint, slug, store]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => stopLoop, [stopLoop]);

  function start() {
    if (sound) unlockAudio();
    base.current = 0;
    lastKey.current = "";
    startedAt.current = performance.now();
    setStatus("running");
    frame.current = requestAnimationFrame(() => tickRef.current());
  }

  function pause() {
    stopLoop();
    base.current += performance.now() - startedAt.current;
    setStatus("paused");
  }

  function resume() {
    if (sound) unlockAudio();
    startedAt.current = performance.now();
    setStatus("running");
    frame.current = requestAnimationFrame(() => tickRef.current());
  }

  function reset() {
    stopLoop();
    base.current = 0;
    lastKey.current = "";
    paint(0, 0);
    setView({ phase: "inhale", secondsLeft: PRESETS[preset][0].seconds, cycle: 1 });
    setStatus("idle");
  }

  const idle = status === "idle";
  const labels: Record<Phase, string> = {
    inhale: t("inhale"),
    holdIn: t("holdIn"),
    exhale: t("exhale"),
    holdOut: t("holdOut"),
  };

  return (
    <Card className="p-5 sm:p-8">
      <div className="flex flex-col items-center">
        <div
          className="relative flex size-72 items-center justify-center sm:size-80"
          role="img"
          aria-label={t("circle")}
        >
          <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
            <circle cx="20" cy="20" r="15.9155" fill="none" strokeWidth="1.2" className="stroke-surface-2" />
            <circle
              ref={ring}
              cx="20"
              cy="20"
              r="15.9155"
              fill="none"
              strokeWidth="1.2"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset="100"
              className="stroke-primary-strong"
            />
          </svg>
          <div
            ref={circle}
            className="flex size-60 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-soft will-change-transform sm:size-64"
            style={{ transform: "scale(0.5)" }}
          />
          {(status === "running" || status === "paused") && (
            <p
              className="absolute inset-0 flex items-center justify-center text-6xl font-extrabold tabular-nums text-[#10202b]"
              aria-hidden="true"
            >
              {view.secondsLeft}
            </p>
          )}
        </div>

        <p aria-live="polite" className="mt-4 min-h-9 max-w-sm text-center text-2xl font-bold">
          {status === "done" ? t("done") : idle ? "" : labels[view.phase]}
        </p>
        {idle && <p className="max-w-sm text-center text-muted">{t("ready")}</p>}

        <p className="mt-1 min-h-6 font-semibold text-muted">
          {status === "running" || status === "paused"
            ? t("cycleOf", { current: view.cycle, total: cycles })
            : ""}
        </p>

        {status === "done" && <p className="mt-2 max-w-md text-center text-muted">{t("doneText")}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {idle && (
            <Button size="lg" onClick={start}>
              <Play className="size-5" aria-hidden="true" />
              {t("start")}
            </Button>
          )}
          {status === "running" && (
            <Button size="lg" variant="secondary" onClick={pause}>
              <Pause className="size-5" aria-hidden="true" />
              {t("pause")}
            </Button>
          )}
          {status === "paused" && (
            <Button size="lg" onClick={resume}>
              <Play className="size-5" aria-hidden="true" />
              {t("resume")}
            </Button>
          )}
          {(status === "running" || status === "paused") && (
            <Button size="lg" variant="ghost" onClick={reset}>
              <Square className="size-4" aria-hidden="true" />
              {t("stop")}
            </Button>
          )}
          {status === "done" && (
            <>
              <Button size="lg" onClick={reset}>
                <RotateCcw className="size-5" aria-hidden="true" />
                {t("again")}
              </Button>
              <ButtonLink href="/" variant="soft" size="lg">
                {tex("markMood")}
              </ButtonLink>
            </>
          )}
        </div>
      </div>

      {idle && (
        <div className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 font-semibold">{t("preset")}</legend>
            <div className="grid gap-2">
              {(["478", "box"] as const).map((p) => (
                <label
                  key={p}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2",
                    preset === p ? "border-primary bg-primary-soft" : "border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="preset"
                    className="size-4 accent-[var(--primary-strong)]"
                    checked={preset === p}
                    onChange={() => {
                      setPreset(p);
                      setView({ phase: "inhale", secondsLeft: PRESETS[p][0].seconds, cycle: 1 });
                    }}
                  />
                  <span>
                    <span className="block font-semibold">{p === "478" ? t("p478") : t("pbox")}</span>
                    <span className="block text-sm text-muted">{p === "478" ? t("p478Hint") : t("pboxHint")}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-5">
            <div>
              <p id="cycles-label" className="mb-2 font-semibold">
                {t("cycles")}
              </p>
              <div className="flex items-center gap-3" role="group" aria-labelledby="cycles-label">
                <button
                  type="button"
                  onClick={() => setCycles((c) => clampCycles(c - 1))}
                  disabled={cycles <= MIN_CYCLES}
                  aria-label="−"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border-strong hover:bg-surface-2 disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <output className="w-10 text-center text-2xl font-bold tabular-nums" aria-live="polite">
                  {cycles}
                </output>
                <button
                  type="button"
                  onClick={() => setCycles((c) => clampCycles(c + 1))}
                  disabled={cycles >= MAX_CYCLES}
                  aria-label="+"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border-strong hover:bg-surface-2 disabled:opacity-40"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <button
              type="button"
              aria-pressed={sound}
              onClick={() => {
                setSound((s) => !s);
                unlockAudio();
              }}
              className={cn(
                "inline-flex min-h-12 items-center gap-3 rounded-2xl border px-4 font-semibold",
                sound ? "border-primary bg-primary-soft" : "border-border-strong",
              )}
            >
              {sound ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5" aria-hidden="true" />}
              <span>
                {t("sound")}: {sound ? t("soundOn") : t("soundOff")}
              </span>
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">{t("tip")}</p>
    </Card>
  );
}
