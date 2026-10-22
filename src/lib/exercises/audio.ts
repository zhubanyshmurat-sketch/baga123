/** Tiny WebAudio helper for soft cue tones. Created lazily from a user gesture (autoplay rules). */

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // Audio is optional.
  }
}

/** Plays a short sine tone with a soft attack and release. */
export function beep(frequency = 440, durationMs = 220, volume = 0.12) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.05);
  } catch {
    // ignore
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
