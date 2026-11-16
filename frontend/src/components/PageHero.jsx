import { cn } from '@/lib/utils'
import WaveLines from '@/components/WaveLines'

// Owner: Si Qi
// Page frame in the same style as the login screen: the teal wave-line texture and glow
// behind the top of the page (fading out further down), and solid cards with a soft shadow.

// Solid card on the textured background, with a light teal-tinted shadow.
export const CARD =
  'rounded-2xl border border-border bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_10px_28px_-14px_hsl(var(--primary)/0.28)] dark:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)]'

export function PageShell({ children, className }) {
  return (
    <div className="relative isolate min-h-full">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"
        aria-hidden="true"
      >
        <WaveLines className="absolute inset-0 h-full w-full opacity-70" />
        {/* Calm the lines behind the title text so it stays readable */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_20%_32%,hsl(var(--background))_35%,transparent_100%)]" />
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl dark:bg-primary/40" />
      </div>
      <div className={cn('mx-auto max-w-5xl space-y-5 p-4 md:p-6', className)}>{children}</div>
    </div>
  )
}

// Page title block, sitting straight on the textured background (no card).
export default function PageHero({ Icon, eyebrow, title, children, actions, className }) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4 px-1 pt-1', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary dark:text-accent">{eyebrow}</p>}
        <h1 className="mt-1.5 flex items-center gap-2.5 text-[28px] font-bold leading-tight tracking-tight text-foreground">
          {Icon && (
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
          )}
          {title}
        </h1>
        {children && <div className="mt-2 max-w-xl text-[15px] text-foreground/75">{children}</div>}
      </div>
      {actions}
    </header>
  )
}
