/** Pure timing logic for the breathing exercises, kept free of React so it can be unit-tested. */

export type Phase = "inhale" | "holdIn" | "exhale" | "holdOut";
export type Preset = "478" | "box";

export interface PhaseSpec {
  phase: Phase;
  seconds: number;
}

export const PRESETS: Record<Preset, PhaseSpec[]> = {
  "478": [
    { phase: "inhale", seconds: 4 },
    { phase: "holdIn", seconds: 7 },
    { phase: "exhale", seconds: 8 },
  ],
  box: [
    { phase: "inhale", seconds: 4 },
    { phase: "holdIn", seconds: 4 },
    { phase: "exhale", seconds: 4 },
    { phase: "holdOut", seconds: 4 },
  ],
};

export const MIN_CYCLES = 1;
export const MAX_CYCLES = 10;

export function clampCycles(value: number): number {
  if (!Number.isFinite(value)) return MIN_CYCLES;
  return Math.min(MAX_CYCLES, Math.max(MIN_CYCLES, Math.round(value)));
}

export function isPreset(value: unknown): value is Preset {
  return value === "478" || value === "box";
}

/** Length of one full cycle in seconds. */
export function cycleSeconds(preset: Preset): number {
  return PRESETS[preset].reduce((sum, p) => sum + p.seconds, 0);
}

export function totalSeconds(preset: Preset, cycles: number): number {
  return cycleSeconds(preset) * clampCycles(cycles);
}

export interface BreathState {
  done: boolean;
  /** 1-based cycle number. */
  cycle: number;
  phase: Phase;
  /** Seconds the current phase lasts. */
  phaseSeconds: number;
  /** 0..1 progress through the current phase. */
  phaseProgress: number;
  /** Whole seconds left in the current phase (counts down, never below 1 while running). */
  secondsLeft: number;
  /** Circle size 0..1: 0 = empty lungs, 1 = full lungs. */
  fill: number;
}

/** Where the exercise is after `elapsedMs` of breathing time. */
export function stateAt(preset: Preset, cycles: number, elapsedMs: number): BreathState {
  const specs = PRESETS[preset];
  const n = clampCycles(cycles);
  const cycleMs = cycleSeconds(preset) * 1000;
  const totalMs = cycleMs * n;

  if (elapsedMs >= totalMs) {
    const last = specs[specs.length - 1];
    return {
      done: true,
      cycle: n,
      phase: last.phase,
      phaseSeconds: last.seconds,
      phaseProgress: 1,
      secondsLeft: 0,
      fill: fillFor(last.phase, 1),
    };
  }

  const t = Math.max(0, elapsedMs);
  const cycle = Math.floor(t / cycleMs);
  let within = t - cycle * cycleMs;
  for (const spec of specs) {
    const ms = spec.seconds * 1000;
    if (within < ms) {
      const progress = within / ms;
      return {
        done: false,
        cycle: cycle + 1,
        phase: spec.phase,
        phaseSeconds: spec.seconds,
        phaseProgress: progress,
        secondsLeft: Math.max(1, Math.ceil((ms - within) / 1000)),
        fill: fillFor(spec.phase, progress),
      };
    }
    within -= ms;
  }
  // Unreachable (within < cycleMs), but keeps the function total.
  return stateAt(preset, cycles, totalMs);
}

/** Lung fill for a phase: inhale rises, exhale falls, holds stay where the previous phase ended. */
export function fillFor(phase: Phase, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  switch (phase) {
    case "inhale":
      return p;
    case "holdIn":
      return 1;
    case "exhale":
      return 1 - p;
    case "holdOut":
      return 0;
  }
}
