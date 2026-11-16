import { cn } from '@/lib'

// Owner: Si Qi - defect status pill with the overdue flag (F02.7, F02.9)
//
// CONTRACT: <StatusBadge status="in_progress" dueDate="2026-11-20" />
//   status   one of the five defect statuses (design/workflow-diagram.md)
//   dueDate  'YYYY-MM-DD' - when given and past, an extra "Overdue" pill shows (unless closed)
// Used by Si Qi's defect list, Jerald's inbox and defect detail, and Kandha's history.
// Colours come from the Elev8 theme tokens (src/index.css); status pills have a leading dot,
// so they read differently from severity pills (which have an icon).

const STATUS_META = {
  open:                 { label: 'Open',                 pill: 'bg-primary/10 text-primary ring-primary/20 dark:text-accent', dot: 'bg-primary dark:bg-accent' },
  acknowledged:         { label: 'Acknowledged',         pill: 'bg-secondary/25 text-foreground/80 ring-secondary/50',       dot: 'bg-secondary' },
  in_progress:          { label: 'In progress',          pill: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300', dot: 'bg-sky-500' },
  pending_verification: { label: 'Pending verification', pill: 'bg-amber-400/15 text-amber-700 ring-amber-500/25 dark:text-amber-300', dot: 'bg-amber-500' },
  closed:               { label: 'Closed',               pill: 'bg-muted text-muted-foreground ring-border',                      dot: 'bg-muted-foreground/50' },
}

// Same rule as defectService.isOverdue on the backend: past due and not closed.
export function isOverdue(status, dueDate, today = new Date()) {
  if (!dueDate || status === 'closed') return false
  return dueDate < today.toISOString().slice(0, 10)
}

export const PILL =
  // One fixed height for every pill, so a row of mixed pills lines up
  'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium leading-none ring-1 ring-inset'

function Dot({ className, pulse }) {
  return (
    <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
      {pulse && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping', className)} />}
      <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', className)} />
    </span>
  )
}

export default function StatusBadge({ status, dueDate, className }) {
  const meta = STATUS_META[status] ?? { label: status, pill: 'bg-muted text-muted-foreground ring-border', dot: 'bg-muted-foreground/50' }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      <span className={cn(PILL, meta.pill)}>
        <Dot className={meta.dot} pulse={meta.pulse} />
        {meta.label}
      </span>
      {isOverdue(status, dueDate) && (
        <span className={cn(PILL, 'bg-destructive/10 text-destructive ring-destructive/20')}>
          <Dot className="bg-destructive" />
          Overdue
        </span>
      )}
    </span>
  )
}
