import { useEffect, useState } from 'react'

// Decorative illustration for the login hero: a lift car in its shaft with a floor
// indicator and an inspection tick. Pure SVG so it stays sharp on high-DPI phones.
//
// Intro choreography (keyframes live in tailwind.config.js):
//   0.0s  car rises up the shaft while the floor indicator counts 1 -> 12
//   0.5s  checklist clipboard swings in, ticks draw themselves
//   1.3s  car arrives, indicator flashes, doors open on the inspector
//   2.2s  verified badge pops in, then its ring pulses forever
//   3.0s  the whole scene floats gently
// Every animation is motion-safe; with reduced motion the final frame shows straight away.

const TARGET_FLOOR = 12
const RIDE_MS = 1300

function prefersMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Counts the floor indicator up in step with the car's ride.
function useFloorCounter() {
  const [floor, setFloor] = useState(() => (prefersMotion() ? 1 : TARGET_FLOOR))

  useEffect(() => {
    if (!prefersMotion() || typeof window.requestAnimationFrame !== 'function') return undefined
    let frame
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / RIDE_MS, 1)
      const eased = 1 - (1 - t) ** 3
      setFloor(Math.max(1, Math.round(1 + eased * (TARGET_FLOOR - 1))))
      if (t < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return floor
}

const fillBox = '[transform-box:fill-box] [transform-origin:center]'

export default function LiftIllustration({ className }) {
  const floor = useFloorCounter()

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
        <linearGradient id="lift-interior" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CCFBF1" />
          <stop offset="1" stopColor="#5EEAD4" />
        </linearGradient>
        <linearGradient id="lift-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5EEAD4" stopOpacity="0.7" />
          <stop offset="1" stopColor="#5EEAD4" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lift-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2DD4BF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#2DD4BF" stopOpacity="0" />
        </radialGradient>
        <clipPath id="lift-shaft">
          <rect x="76" y="8" width="88" height="156" />
        </clipPath>
        <clipPath id="lift-doorway">
          <rect x="90" y="58" width="60" height="94" rx="3" />
        </clipPath>
      </defs>

      <g className={`motion-safe:animate-float ${fillBox}`}>
        <ellipse cx="120" cy="108" rx="110" ry="90" fill="url(#lift-glow)" className={`motion-safe:animate-breathe ${fillBox}`} />

        {/* Shaft rails */}
        <rect x="72" y="8" width="4" height="184" rx="2" fill="#334155" />
        <rect x="164" y="8" width="4" height="184" rx="2" fill="#334155" />

        {/* Car (with its cables) rides up inside the shaft */}
        <g clipPath="url(#lift-shaft)">
          <g className="motion-safe:animate-lift-rise">
            <line x1="108" y1="-300" x2="108" y2="48" stroke="#64748B" strokeWidth="2" />
            <line x1="132" y1="-300" x2="132" y2="48" stroke="#64748B" strokeWidth="2" />
            <rect x="82" y="48" width="76" height="112" rx="10" fill="url(#lift-car)" />

            {/* Interior: lit cab with an inspector, revealed when the doors open */}
            <g clipPath="url(#lift-doorway)">
              <rect x="90" y="58" width="60" height="94" fill="url(#lift-interior)" />
              <rect x="96" y="62" width="48" height="3" rx="1.5" fill="#fff" opacity="0.9" />
              <path d="M111 90a9 9 0 0 1 18 0z" fill="#F59E0B" />
              <rect x="109" y="89" width="22" height="3" rx="1.5" fill="#D97706" />
              <circle cx="120" cy="97" r="6.5" fill="#0F766E" />
              <rect x="107" y="105" width="26" height="47" rx="11" fill="#0F766E" />
              <rect x="115" y="112" width="10" height="13" rx="2" fill="#F8FAFC" />
              <path d="M117.5 118.5l1.8 1.8 3.4-3.6" stroke="#0F766E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

              {/* 1px gap between the doors lets the cab light glow through the seam */}
              <rect x="90" y="58" width="29.5" height="94" rx="3" fill="url(#lift-door)" className="motion-safe:animate-door-left" />
              <rect x="120.5" y="58" width="29.5" height="94" rx="3" fill="url(#lift-door)" className="motion-safe:animate-door-right" />
            </g>
          </g>
        </g>

        {/* Light spilling onto the landing while the doors are open */}
        <path d="M92 164h56l18 22H74z" fill="url(#lift-spill)" opacity="0" className="motion-safe:animate-light-spill" />

        {/* Landing floor */}
        <rect x="40" y="164" width="160" height="6" rx="3" fill="#334155" />

        {/* Floor indicator (drawn over the cables) */}
        <rect x="96" y="20" width="48" height="20" rx="6" fill="#0F172A" stroke="#2DD4BF" strokeOpacity="0.5" />
        <rect x="96" y="20" width="48" height="20" rx="6" stroke="#5EEAD4" strokeWidth="2" opacity="0" className="motion-safe:animate-flash" />
        <path d="M106 34l5-7 5 7" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="motion-safe:animate-arrow-nudge" />
        <text x="122" y="35" fill="#5EEAD4" fontSize="12" fontWeight="700" fontFamily="ui-monospace, monospace">
          {String(floor).padStart(2, '0')}
        </text>

        {/* Checklist clipboard */}
        <g className={`motion-safe:animate-slide-tilt-in ${fillBox}`}>
          <g transform="translate(14 92) rotate(-8)">
            <rect width="46" height="58" rx="7" fill="#1E293B" stroke="#475569" />
            <rect x="14" y="-4" width="18" height="8" rx="3" fill="#64748B" />
            <path d="M9 18l3 3 6-6" stroke="#2DD4BF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20" className="motion-safe:animate-draw" style={{ animationDelay: '1.2s' }} />
            <rect x="22" y="16" width="16" height="3" rx="1.5" fill="#64748B" />
            <path d="M9 31l3 3 6-6" stroke="#2DD4BF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20" className="motion-safe:animate-draw" style={{ animationDelay: '1.5s' }} />
            <rect x="22" y="29" width="16" height="3" rx="1.5" fill="#64748B" />
            <circle cx="13" cy="45" r="3.5" stroke="#F59E0B" strokeWidth="2" className={`motion-safe:animate-pulse ${fillBox}`} />
            <rect x="22" y="43" width="12" height="3" rx="1.5" fill="#64748B" />
          </g>
        </g>

        {/* Verified badge */}
        <g transform="translate(168 58)">
          <circle cx="22" cy="22" r="22" fill="none" stroke="#5EEAD4" strokeWidth="3" opacity="0" className={`motion-safe:animate-ping-ring ${fillBox}`} />
          <g className={`motion-safe:animate-pop ${fillBox}`}>
            <circle cx="22" cy="22" r="22" fill="#14B8A6" />
            <circle cx="22" cy="22" r="22" fill="none" stroke="#99F6E4" strokeOpacity="0.5" strokeWidth="6" />
            <path d="M13 22.5l6 6 12-13" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" className="motion-safe:animate-draw" style={{ animationDelay: '2.5s', animationDuration: '0.5s' }} />
          </g>
        </g>
      </g>
    </svg>
  )
}
