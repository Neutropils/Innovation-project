import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// Brushed-steel lift doors that cover the sign-in form and open mechanically:
// a small clunk as the lock releases, the motor ramps up, a steady drive, then a firm stop
// with a slight overrun - like a real lift door operator. Motion stays inside the card.
// Purely visual (aria-hidden): the form underneath stays in the DOM the whole time.

const OPEN_MS = 1400

// translateX keyframes; dir -1 = left door, 1 = right door.
// Offsets: clunk (0-12%), motor ramp (12-28%), constant drive (28-84%), overrun + stop.
const travel = (dir) => [
  { transform: 'translateX(0)',                                  offset: 0,    easing: 'ease-out' },
  { transform: `translateX(${-dir * 2}px)`,                      offset: 0.05, easing: 'ease-in' },    // lock releases, door nudges in
  { transform: 'translateX(0)',                                  offset: 0.12, easing: 'ease-in' },    // ...and settles
  { transform: `translateX(${dir * 6}%)`,                        offset: 0.28, easing: 'linear' },     // motor ramps up
  { transform: `translateX(${dir * 88}%)`,                       offset: 0.84, easing: 'ease-out' },   // steady drive
  { transform: `translateX(calc(${dir * 100}% + ${dir * 3}px))`, offset: 0.94, easing: 'ease-in-out' }, // overrun
  { transform: `translateX(${dir * 100}%)`,                      offset: 1 },                          // hits the stop
]

// Smooth satin panels (no brushing or kick plates - keeps the look modern, not industrial)
const STEEL =
  'bg-[linear-gradient(90deg,hsl(165_12%_80%)_0%,hsl(165_14%_90%)_45%,hsl(165_14%_92%)_55%,hsl(165_12%_81%)_100%)] ' +
  'dark:bg-[linear-gradient(90deg,hsl(160_10%_14%)_0%,hsl(165_12%_22%)_45%,hsl(165_12%_24%)_55%,hsl(160_10%_15%)_100%)]'

function Door({ side, doorRef }) {
  const left = side === 'left'
  return (
    <div
      ref={doorRef}
      className={cn(
        'absolute inset-y-0 w-1/2 overflow-hidden will-change-transform',
        STEEL,
        left ? 'left-0 border-r border-black/15 dark:border-black/40' : 'right-0 border-l border-black/15 dark:border-black/40',
      )}
    >
      {/* Light from the seam reflected on each door's inner edge */}
      <div className={cn('absolute inset-y-0 w-10 from-primary/25 to-transparent dark:from-primary/40', left ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r')} />
      {/* Ceiling light reflected near the top of the doors */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
    </div>
  )
}

export default function LiftDoors({ opening, onOpened }) {
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const seamRef = useRef(null)
  const onOpenedRef = useRef(onOpened)
  onOpenedRef.current = onOpened

  useEffect(() => {
    if (!opening) return undefined
    const left = leftRef.current
    const right = rightRef.current
    if (typeof left?.animate !== 'function') {
      onOpenedRef.current?.()
      return undefined
    }
    const timing = { duration: OPEN_MS, fill: 'forwards' }
    const animations = [left.animate(travel(-1), timing), right.animate(travel(1), timing)]
    // The seam light flickers as the lock releases, then fades as the gap opens
    animations.push(seamRef.current.animate(
      // Final keyframe at offset 1 is required - without it the light fades back in by the end
      [{ opacity: 1 }, { opacity: 0.4, offset: 0.04 }, { opacity: 1, offset: 0.08 }, { opacity: 0, offset: 0.3 }, { opacity: 0, offset: 1 }],
      timing
    ))
    animations[0].onfinish = () => onOpenedRef.current?.()
    return () => animations.forEach((a) => a.cancel())
  }, [opening])

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true" data-testid="lift-doors">
      <Door side="left" doorRef={leftRef} />
      <Door side="right" doorRef={rightRef} />
      <div
        ref={seamRef}
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white shadow-[0_0_12px_3px_hsl(var(--primary)/0.6)] dark:bg-foreground/90 dark:shadow-[0_0_14px_3px_hsl(var(--primary)/0.9)]"
      />
    </div>
  )
}
