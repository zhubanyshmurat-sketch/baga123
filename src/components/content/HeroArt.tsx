/** Soft abstract illustration for the home page: layered circles that slowly "breathe". */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hero-teal" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#7be0d3" />
          <stop offset="1" stopColor="#2eb5a6" />
        </radialGradient>
        <radialGradient id="hero-lav" cx="60%" cy="40%" r="70%">
          <stop offset="0" stopColor="#b9aeff" />
          <stop offset="1" stopColor="#8c7bea" />
        </radialGradient>
      </defs>
      <g className="origin-center animate-[breathe_7s_ease-in-out_infinite]" style={{ transformOrigin: "200px 200px" }}>
        <circle cx="200" cy="200" r="150" fill="url(#hero-lav)" opacity="0.28" />
        <circle cx="200" cy="200" r="112" fill="url(#hero-teal)" opacity="0.5" />
      </g>
      <g className="origin-center animate-[breathe_7s_ease-in-out_infinite_reverse]" style={{ transformOrigin: "200px 200px" }}>
        <circle cx="262" cy="150" r="64" fill="url(#hero-lav)" opacity="0.85" />
        <circle cx="146" cy="244" r="58" fill="url(#hero-teal)" opacity="0.9" />
      </g>
      <path
        d="M170 214c18 22 52 22 70 0"
        fill="none"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="176" cy="178" r="7" fill="#fff" />
      <circle cx="234" cy="178" r="7" fill="#fff" />
    </svg>
  );
}
