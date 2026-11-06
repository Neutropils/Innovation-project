// Decorative illustration for the login hero: a lift car in its shaft with a floor
// indicator and an inspection tick. Pure SVG so it stays sharp on high-DPI phones.
export default function LiftIllustration({ className }) {
  return (
    <svg viewBox="0 0 240 200" fill="none" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lift-car" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="lift-door" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
        <radialGradient id="lift-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2DD4BF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#2DD4BF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="120" cy="108" rx="110" ry="90" fill="url(#lift-glow)" />

      {/* Shaft rails and cables */}
      <rect x="72" y="8" width="4" height="184" rx="2" fill="#334155" />
      <rect x="164" y="8" width="4" height="184" rx="2" fill="#334155" />
      <line x1="108" y1="8" x2="108" y2="46" stroke="#64748B" strokeWidth="2" />
      <line x1="132" y1="8" x2="132" y2="46" stroke="#64748B" strokeWidth="2" />

      {/* Floor indicator */}
      <rect x="96" y="20" width="48" height="20" rx="6" fill="#0F172A" stroke="#2DD4BF" strokeOpacity="0.5" />
      <path d="M106 34l5-7 5 7" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="124" y="35" fill="#5EEAD4" fontSize="12" fontWeight="700" fontFamily="ui-monospace, monospace">12</text>

      {/* Car */}
      <rect x="82" y="48" width="76" height="112" rx="10" fill="url(#lift-car)" />
      <rect x="90" y="58" width="29" height="94" rx="3" fill="url(#lift-door)" />
      <rect x="121" y="58" width="29" height="94" rx="3" fill="url(#lift-door)" />
      <line x1="120" y1="58" x2="120" y2="152" stroke="#475569" strokeWidth="1.5" />

      {/* Landing floor */}
      <rect x="40" y="164" width="160" height="6" rx="3" fill="#334155" />

      {/* Checklist clipboard */}
      <g transform="translate(14 92) rotate(-8)">
        <rect width="46" height="58" rx="7" fill="#1E293B" stroke="#475569" />
        <rect x="14" y="-4" width="18" height="8" rx="3" fill="#64748B" />
        <path d="M9 18l3 3 6-6" stroke="#2DD4BF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="22" y="16" width="16" height="3" rx="1.5" fill="#64748B" />
        <path d="M9 31l3 3 6-6" stroke="#2DD4BF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="22" y="29" width="16" height="3" rx="1.5" fill="#64748B" />
        <circle cx="13" cy="45" r="3.5" stroke="#F59E0B" strokeWidth="2" />
        <rect x="22" y="43" width="12" height="3" rx="1.5" fill="#64748B" />
      </g>

      {/* Verified badge */}
      <g transform="translate(168 58)">
        <circle cx="22" cy="22" r="22" fill="#14B8A6" />
        <circle cx="22" cy="22" r="22" fill="none" stroke="#99F6E4" strokeOpacity="0.5" strokeWidth="6" />
        <path d="M13 22.5l6 6 12-13" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
