import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// Shared page states: use these for "couldn't load" and "nothing here" so every page
// handles them the same way.

export function ErrorState({ title = 'Couldn’t load this page', message = 'Check your connection and try again.', onRetry, className }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center', className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ Icon, title, message, action, className }) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center', className)}>
      {Icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
      )}
      <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
      {message && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
