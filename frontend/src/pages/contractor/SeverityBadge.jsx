import { cn } from '@/lib'

// Owner: Jerald
// Defect severity tag from the Figma Make design: <SeverityBadge severity="Critical" />

// Shared tag shape, also used for the OVERDUE tag on DefectCard.
export const TAG = 'inline-flex min-h-[22px] items-center whitespace-nowrap rounded-[7px] px-2 py-0.5 text-[11px] font-extrabold tracking-[0.025em]'

const SEVERITY_STYLES = {
  Critical: 'bg-[#fee2e2] text-[#a82121]',
  Major:    'bg-[#ffedd5] text-[#a54a09]',
  Minor:    'bg-[#fef3c7] text-[#8a5d05]',
}

export default function SeverityBadge({ severity, className }) {
  return (
    <span className={cn(TAG, SEVERITY_STYLES[severity] ?? 'bg-slate-100 text-slate-700', className)}>
      {severity}
    </span>
  )
}
