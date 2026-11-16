import { AlarmClock, AlertOctagon, AlertTriangle, CircleDot, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PILL } from '@/components/StatusBadge'
import { dueText } from './defectDisplay'

// Owner: Si Qi - severity and due-date pills for defect rows.
// Severity pills carry an icon and status pills a dot, so the two never look alike.

const SEVERITY_PILL = {
  critical: { label: 'Critical', Icon: AlertOctagon, className: 'bg-red-500/10 font-semibold text-red-700 ring-red-500/25 dark:text-red-300' },
  major:    { label: 'Major',    Icon: AlertTriangle, className: 'bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:text-orange-300' },
  minor:    { label: 'Minor',    Icon: CircleDot, className: 'bg-muted text-muted-foreground ring-border' },
}

export function SeverityPill({ severity }) {
  const meta = SEVERITY_PILL[severity] ?? SEVERITY_PILL.minor
  const { Icon } = meta
  return (
    <span className={cn(PILL, 'pl-2', meta.className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

const DUE_TONE = {
  overdue: 'bg-destructive/10 text-destructive ring-destructive/20',
  soon:    'bg-amber-400/15 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  normal:  'bg-card text-muted-foreground ring-border',
}

export function DuePill({ defect }) {
  const due = dueText(defect)
  if (!due.text) return null
  const Icon = due.tone === 'overdue' ? AlarmClock : Clock
  return (
    <span className={cn(PILL, 'pl-2', DUE_TONE[due.tone] ?? DUE_TONE.normal, due.tone === 'overdue' && 'font-semibold')}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {due.text}
    </span>
  )
}

// Compact due date for the top-right of a defect row (no pill, so it never wraps the row).
export function DueTag({ defect }) {
  const due = dueText(defect)
  if (!due.text) return null
  const Icon = due.tone === 'overdue' ? AlarmClock : Clock
  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1 whitespace-nowrap text-xs',
        due.tone === 'overdue' ? 'font-semibold text-destructive' : due.tone === 'soon' ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-muted-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {due.text}
    </span>
  )
}
