import { cn } from '@/lib'

// Owner: Si Qi - defect status pill with the overdue flag (F02.7, F02.9)
//
// CONTRACT: <StatusBadge status="in_progress" dueDate="2026-11-20" />
//   status   one of the five defect statuses (design/workflow-diagram.md)
//   dueDate  'YYYY-MM-DD' - when given and past, an extra "Overdue" pill shows (unless closed)
// Used by Si Qi's defect list, Jerald's inbox and defect detail, and Kandha's history.

const STATUS_META = {
  open:                 { label: 'Open',                 className: 'bg-blue-100 text-blue-800' },
  acknowledged:         { label: 'Acknowledged',         className: 'bg-indigo-100 text-indigo-800' },
  in_progress:          { label: 'In progress',          className: 'bg-amber-100 text-amber-800' },
  pending_verification: { label: 'Pending verification', className: 'bg-purple-100 text-purple-800' },
  closed:               { label: 'Closed',               className: 'bg-green-100 text-green-800' },
}

// Same rule as defectService.isOverdue on the backend: past due and not closed.
export function isOverdue(status, dueDate, today = new Date()) {
  if (!dueDate || status === 'closed') return false
  return dueDate < today.toISOString().slice(0, 10)
}

export default function StatusBadge({ status, dueDate, className }) {
  const meta = STATUS_META[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', meta.className)}>{meta.label}</span>
      {isOverdue(status, dueDate) && (
        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">Overdue</span>
      )}
    </span>
  )
}
