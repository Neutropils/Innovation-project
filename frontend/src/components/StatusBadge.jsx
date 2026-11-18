import { cn } from '@/lib'

// Owner: Si Qi - defect status pill with the overdue flag (F02.7, F02.9)
//
// CONTRACT: <StatusBadge status="in_progress" dueDate="2026-11-20" />
//   status   one of the five defect statuses (design/workflow-diagram.md)
//   dueDate  'YYYY-MM-DD' - when given and past, an extra "Overdue" pill shows (unless closed)
// Used by Si Qi's defect list, Jerald's inbox and defect detail, and Kandha's history.
// Colours come from the Elev8 theme tokens (src/index.css).

const STATUS_META = {
  open:                 { label: 'Open',                 className: 'bg-primary/10 text-primary ring-primary/20' },
  acknowledged:         { label: 'Acknowledged',         className: 'bg-secondary/25 text-foreground ring-secondary/50' },
  in_progress:          { label: 'In progress',          className: 'bg-accent/15 text-accent ring-accent/30' },
  pending_verification: { label: 'Pending verification', className: 'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300' },
  closed:               { label: 'Closed',               className: 'bg-muted text-muted-foreground ring-border' },
}

// Same rule as defectService.isOverdue on the backend: past due and not closed.
export function isOverdue(status, dueDate, today = new Date()) {
  if (!dueDate || status === 'closed') return false
  const local = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return dueDate < local
}

const PILL = 'rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export default function StatusBadge({ status, dueDate, className }) {
  const meta = STATUS_META[status] ?? { label: status, className: 'bg-muted text-muted-foreground ring-border' }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      <span className={cn(PILL, meta.className)}>{meta.label}</span>
      {isOverdue(status, dueDate) && (
        <span className={cn(PILL, 'bg-destructive/10 text-destructive ring-destructive/30')}>Overdue</span>
      )}
    </span>
  )
}
