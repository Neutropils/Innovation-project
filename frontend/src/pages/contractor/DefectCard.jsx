import { Link } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import SeverityBadge, { TAG } from './SeverityBadge'
import LiftIcon from './LiftIcon'
import { CARD, PRIMARY_BUTTON, dueLabel, formatDue, isDefectOverdue } from './defectFormat'

// Owner: Jerald
// One defect in the contractor Inbox, matching the Figma Make design.
// The card body links to /defects/<id>; the Acknowledge button only shows
// when onAcknowledge is passed (the New tab).
export default function DefectCard({ defect, onAcknowledge }) {
  const overdue = isDefectOverdue(defect)

  return (
    <Card className={cn(CARD, 'overflow-hidden', overdue && 'border-l-[3px] border-l-[#e45555]')}>
      <Link
        to={`/defects/${defect.id}`}
        className="-m-2 block rounded-xl p-2 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6]"
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-[0.06em] text-[#5e6a76]">{defect.code}</span>
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
          aria-label={`View and acknowledge ${defect.code}`}
          className={cn(PRIMARY_BUTTON, 'mt-3.5 w-full')}
        >
          View and acknowledge
        </Button>
      )}
    </Card>
  )
}
