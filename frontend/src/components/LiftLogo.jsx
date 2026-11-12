import { useId } from 'react'
import { cn } from '@/lib/utils'

// Elev8 brand mark: a lift door frame with up/down lamps above it and a check mark inside -
// the lift has been checked. Coloured from the theme tokens in src/index.css:
// primary (teal) tile, peach lamp and check, white frame - the same in light and dark mode.
export default function LiftLogo({ className, title = 'Elev8' }) {
  const id = useId().replace(/:/g, '')

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-10 w-10', className)}
      // Pass title="" when the name is already written next to the logo
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      <defs>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Tile */}
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14" className="fill-primary stroke-black/10" strokeWidth="1.5" />

      {/* Direction lamps: up lit, down dim */}
      <path d="M24.5 14.5 L28 9.5 L31.5 14.5 Z" className="fill-[#FFCB9A]" />
      <path d="M32.5 9.5 L39.5 9.5 L36 14.5 Z" className="fill-white/35" />

      {/* Car opening with the check mark */}
      <rect x="17" y="21" width="30" height="31" rx="1.5" className="fill-[hsl(180_30%_6%)]" />
      <path
        d="M24.5 37 L30 42.5 L40 31.5"
        fill="none"
        className="stroke-[#FFCB9A]"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${id}-glow)`}
      />

      {/* Frame */}
      <rect x="15.75" y="19.75" width="32.5" height="33.5" rx="2.5" fill="none" className="stroke-white/90" strokeWidth="2.5" />
    </svg>
  )
}
