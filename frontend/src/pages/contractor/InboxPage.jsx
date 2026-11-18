import { useState } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '@/hooks'
import { cn } from '@/lib'
import DefectCard, { isDefectOverdue } from './DefectCard'
import { CONTRACTOR_NAME, getMockDefects } from './mockDefects'

// Owner: Jerald
// Features: F03.2 assigned-defect inbox, F03.3 acknowledge - contractor home
// Wireframe: design/screens.md "Inbox"; visual design: Figma Make "Lift Contractor Defect Spot-Check"
// Each card links to /defects/<id>.
// Uses hard-coded sample data for now; will switch to GET /api/inbox?status= and
// POST /api/defects/:id/acknowledge once those endpoints exist.

const TABS = [
  {
    key: 'new',
    label: 'New',
    statuses: ['open'],
    showCount: true,
    emptyTitle: 'No new defects',
    emptyText: "You're all caught up.",
  },
  {
    key: 'in_progress',
    label: 'In progress',
    statuses: ['acknowledged', 'in_progress', 'pending_verification'],
    showCount: true,
    emptyTitle: 'Nothing in progress',
    emptyText: 'Acknowledged defects will appear here.',
  },
  {
    key: 'done',
    label: 'Done',
    statuses: ['closed'],
    showCount: false,
    emptyTitle: 'No completed defects',
    emptyText: 'Signed-off and closed defects will appear here.',
  },
]

// Overdue first, then the soonest due date.
function byUrgency(a, b) {
  const overdueDiff = Number(isDefectOverdue(b)) - Number(isDefectOverdue(a))
  return overdueDiff || a.dueDate.localeCompare(b.dueDate)
}

export default function InboxPage() {
  const { user } = useAuth()
  const [defects, setDefects] = useState(() => getMockDefects())
  const [activeKey, setActiveKey] = useState('new')
  const [notice, setNotice] = useState('')

  const tabDefects = (tab) => defects.filter((d) => tab.statuses.includes(d.status))
  const activeTab = TABS.find((t) => t.key === activeKey)
  const visible = tabDefects(activeTab).sort(byUrgency)
  const initial = (user?.name?.trim()?.[0] ?? 'C').toUpperCase()

  function acknowledge(id) {
    setDefects((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'acknowledged' } : d)))
    setNotice(`${id} acknowledged and moved to In progress.`)
  }

  return (
    <div className="flex min-h-full flex-col bg-[#f7f9fa] text-[#15202e]">
      <header className="flex min-h-[112px] items-center justify-between gap-4 bg-[#0b1728] px-5 py-6 text-white md:px-10 md:py-7">
        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8da3b9]">
            Contractor workspace
          </p>
          {/* Reads "Apex Lifts - Inbox"; only "Inbox" is the h1 so the page heading stays the same on every role home. */}
          <div className="flex flex-wrap items-baseline gap-x-1.5 text-[22px] font-bold tracking-[-0.03em] md:text-[26px]">
            <span>{CONTRACTOR_NAME} -</span>
            <h1>Inbox</h1>
          </div>
        </div>
        <span
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-white/15 bg-[#14b8a6]/15 text-sm font-bold text-[#a8fff4]"
          aria-hidden="true"
        >
          {initial}
        </span>
      </header>

      <div
        role="tablist"
        aria-label="Defect status"
        className="grid grid-cols-[1fr_1.45fr_0.8fr] gap-1 border-b border-[#e4e9ec] bg-white px-3.5 md:px-[34px]"
      >
        {TABS.map((tab) => {
          const selected = tab.key === activeKey
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={selected}
              aria-controls="inbox-panel"
              onClick={() => setActiveKey(tab.key)}
              className={cn(
                'relative flex min-h-[52px] items-center justify-center gap-1 px-1 text-sm font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14b8a6]',
                selected ? 'text-[#0b877b]' : 'text-[#78838e] hover:text-[#4e5b67]'
              )}
            >
              {tab.label}
              {tab.showCount && (
                <span
                  className={cn(
                    'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]',
                    selected ? 'bg-[#ccfbf1] text-[#08766d]' : 'bg-[#edf0f2] text-[#55616d]'
                  )}
                >
                  {tabDefects(tab).length}
                </span>
              )}
              {selected && (
                <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-t-sm bg-[#14b8a6]" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      <p role="status" className="sr-only">{notice}</p>

      <section
        id="inbox-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab.key}`}
        className="flex-1 px-4 pb-10 pt-4 md:px-10 md:pb-14 md:pt-6"
      >
        <div className="mx-0.5 mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-[#263342]">
            {visible.length} {visible.length === 1 ? 'defect' : 'defects'}
          </p>
          <span className="text-xs font-medium text-[#89939d]">Sorted by urgency</span>
        </div>

        {visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-4 grid h-[58px] w-[58px] place-items-center rounded-full bg-[#e1faf6] text-[#0f9d8e]">
              <Check className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mb-1.5 text-base font-bold">{activeTab.emptyTitle}</h2>
            <p className="text-[13px] text-[#84909a]">{activeTab.emptyText}</p>
          </div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2 lg:gap-[18px]">
            {visible.map((defect) => (
              <li key={defect.id}>
                <DefectCard
                  defect={defect}
                  onAcknowledge={activeTab.key === 'new' ? acknowledge : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
