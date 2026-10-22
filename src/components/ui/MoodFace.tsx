const mouths: Record<number, string> = {
  1: "M9 24c2-4 10-4 12 0",
  2: "M10 23.5c1.6-2.2 8.4-2.2 10 0",
  3: "M10 22.5h10",
  4: "M10 21.5c1.6 2.4 8.4 2.4 10 0",
  5: "M9 20.5c2 5 10 5 12 0",
};

/** Five face shapes (not colours) carry the meaning, so the scale works without colour vision. */
export function MoodFace({ mood, size = 40 }: { mood: 1 | 2 | 3 | 4 | 5; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true" focusable="false">
      <circle cx="15" cy="15" r="13" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="10.5" cy="12.5" r="1.4" fill="currentColor" />
      <circle cx="19.5" cy="12.5" r="1.4" fill="currentColor" />
      <path d={mouths[mood]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {mood === 1 && <path d="M7.5 9.5l4-1M22.5 9.5l-4-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}
