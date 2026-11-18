import { Link } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import SeverityBadge, { TAG } from './SeverityBadge'

// Owner: Jerald
// One defect in the contractor Inbox, matching the Figma Make design.
// The card body links to /defects/<id>; the Acknowledge button only shows
// when onAcknowledge is passed (the New tab).

// Lift icon from the Figma Make design (a lift car with up/down arrows).
function LiftIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="m9 8 3-3 3 3M9 16l3 3 3-3M12 5v14" />
    </svg>
  )
}

// Whole days from today to a 'YYYY-MM-DD' date, in local time. Negative = in the past.
export function daysUntil(dueDate, today = new Date()) {
  const [y, m, d] = dueDate.split('-').map(Number)
  const due = Date.UTC(y, m - 1, d)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due - now) / 86_400_000)
}

export function isDefectOverdue(defect, today = new Date()) {
  return defect.status !== 'closed' && daysUntil(defect.dueDate, today) < 0
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// '17:00' -> '5:00 PM'
function formatTime(time) {
  const [h, min] = time.split(':').map(Number)
  return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// '2026-11-16' + '17:00' -> '16 Nov 2026, 5:00 PM'
export function formatDue(dueDate, dueTime) {
  const date = parseDate(dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  return dueTime ? `${date}, ${formatTime(dueTime)}` : date
}

export function dueLabel(defect, today = new Date()) {
  if (defect.status === 'closed') {
    const done = defect.completedDate ?? defect.dueDate
    return `Completed on ${parseDate(done).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}`
  }
  const days = daysUntil(defect.dueDate, today)
  if (days < 0) return `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

export default function DefectCard({ defect, onAcknowledge }) {
  const overdue = isDefectOverdue(defect)

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[18px] border-[#e2e7ea] bg-white p-4 text-[#172330] shadow-[0_4px_16px_rgba(24,39,56,0.035)]',
        overdue && 'border-l-[3px] border-l-[#e45555]'
      )}
    >
      <Link
        to={`/defects/${defect.id}`}
        className="-m-2 block rounded-xl p-2 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]"
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-[0.06em] text-[#5e6a76]">{defect.id}</span>
          <div className="flex items-center gap-1.5">
            <SeverityBadge severity={defect.severity} />
            {overdue && <span className={cn(TAG, 'bg-[#dc4545] text-white')}>OVERDUE</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#0f766e]">
          <LiftIcon className="flex-shrink-0" />
          <strong className="text-[15px] font-semibold text-[#263442]">{defect.liftCode}</strong>
        </div>
        <div className="ml-px mt-1.5 flex items-start gap-1.5 text-[13px] text-[#82909c]">
          <MapPin className="mt-px h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{defect.address}</span>
        </div>

        <h3 className="mb-3 mt-3.5 break-words text-[17px] font-bold tracking-[-0.015em] text-[#172330]">
          {defect.description}
        </h3>

        <div
          className={cn(
            'flex items-center gap-2.5 rounded-[11px] px-3 py-2.5',
            overdue ? 'bg-[#fff3f2] text-[#c43c3c]' : 'bg-[#f4f6f7] text-[#70808c]'
          )}
        >
          <Calendar className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
            <span className={cn('text-[13px] font-bold', overdue ? 'text-[#b62f2f]' : 'text-[#4e5b67]')}>
              {dueLabel(defect)}
            </span>
            <span className="text-xs text-[#89949e]">{formatDue(defect.dueDate, defect.dueTime)}</span>
          </div>
        </div>
      </Link>

      {onAcknowledge && (
        <Button
          type="button"
          onClick={() => onAcknowledge(defect.id)}
          aria-label={`Acknowledge ${defect.id}`}
          className="mt-3.5 h-12 w-full rounded-xl border border-[#0da392] bg-gradient-to-br from-[#17bea9] to-[#0d9f91] text-sm font-bold text-white shadow-[0_6px_14px_rgba(13,159,145,0.2)] transition hover:from-[#14ad9a] hover:to-[#0b8f82] active:scale-[0.98] focus-visible:ring-[#14b8a6]"
        >
          Acknowledge
        </Button>
      )}
    </Card>
  )
}
