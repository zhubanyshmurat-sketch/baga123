import { useId } from "react";

/** StudentMind mark: a sprout on a teal-to-lavender tile. Decorative; the wordmark carries the name. */
export function LogoMark({ size = 36 }: { size?: number }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2EB5A6" />
          <stop offset="1" stopColor="#8C7BEA" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill={`url(#${id})`} />
      <path d="M16 25V16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 18c-5.2 0-7.6-3.6-7.6-7 4.6 0 7.6 2.6 7.6 7Z" fill="#fff" />
      <path d="M16 15.5c0-4.4 2.6-7.4 7.6-7.4 0 4.6-3 7.4-7.6 7.4Z" fill="#fff" fillOpacity=".85" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="text-lg font-bold tracking-tight text-fg">
      Student<span className="text-primary-strong">Mind</span>
    </span>
  );
}
