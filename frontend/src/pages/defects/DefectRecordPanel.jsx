import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarClock, CheckCircle2, ChevronDown, ClipboardCheck, ClipboardList, ListChecks, MapPin, UserRound } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib'
import { useAuth } from '@/context/AuthContext'
import PageHero, { CARD, PageShell } from '@/components/PageHero'
import { ErrorState } from '@/components/StateViews'
import { OfflineBanner, OfflineState, useOfflineLoad } from '@/components/OfflineMode'
import StatusBadge from '@/components/StatusBadge'
import { SEVERITY_META, dueText } from './defectDisplay'
import DefectHistory from './DefectHistory'
import ReassignDefect from './ReassignDefect'

// Owner: Si Qi
// Features: F02.2 one defect by its ID, F02.4 reassign (admin), F02.10 rectification history.
// The top of the Defect detail page (/defects/:id). Jerald's page renders it above his
// contractor and verification actions; when he builds that page he can keep this panel, or
// place <ReassignDefect> and <DefectHistory> himself.
// Reads GET /api/defects/:id.

// Days to fix by severity - same placeholders as the backend's SEVERITY_DUE_DAYS (TBC with EMS)
const SEVERITY_DUE_DAYS = { critical: 1, major: 7, minor: 14 }

function Fact({ Icon, label, children, className }) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium text-foreground">{children}</dd>
      </div>
    </div>
  )
}

export default function DefectRecordPanel({ defectId }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [historyKey, setHistoryKey] = useState(0)
  const [notice, setNotice] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const fetchDefect = useCallback(
    () => api.get(`/defects/${defectId}`).then((res) => res.data.data),
    [defectId]
  )
  const [state, load] = useOfflineLoad(`defect:${defectId}`, fetchDefect)

  useEffect(() => { load() }, [load])

  const defect = state.data
  const offline = Boolean(state.savedAt)
  const canReassign = user?.role === 'admin' && defect && defect.status !== 'closed' && !offline

  // Back to wherever they came from; their home list if the page was opened directly
  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate(user?.role === 'contractor' ? '/inbox' : '/defects')
  }

  function handleReassigned(updated) {
    setNotice(`Reassigned to ${updated.contractorName}. It has moved to their inbox.`)
    load()
    setHistoryKey((k) => k + 1)
  }

  const severity = defect && SEVERITY_META[defect.severity]
  const due = defect && dueText(defect)

  return (
    <PageShell>
      <button
        type="button"
        onClick={goBack}
        className="-mb-2 -ml-2 inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <PageHero
        Icon={ClipboardList}
        eyebrow={defect ? `${defect.liftCode ?? ''} ${defect.liftName ?? ''}`.trim() || 'Defect' : 'Defect'}
        title={defect?.code ?? `Defect ${defectId}`}
      >
        {defect && <StatusBadge status={defect.status} dueDate={defect.dueDate} />}
      </PageHero>

      {state.savedAt && <OfflineBanner savedAt={state.savedAt} what="defect" onRetry={load} retrying={state.retrying} />}

      {state.status === 'loading' && <div className={cn(CARD, 'h-44 animate-pulse')} aria-hidden="true" />}

      {state.status === 'offline' && <OfflineState onRetry={load} retrying={state.retrying} />}

      {state.status === 'error' && (
        <ErrorState
          title="Couldn’t load this defect"
          message="It may not exist, or it belongs to another company. Go back and pick it from the list."
          onRetry={load}
        />
      )}

      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}

      {state.status === 'ready' && defect && (
        <>
          <section aria-label="Defect summary" className={cn(CARD, 'space-y-4 p-4')}>
            <div>
              <p className="text-base font-semibold text-foreground">{defect.item || defect.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {severity && <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', severity.className)}>{severity.label}</span>}
                {due?.text && (
                  <span className={cn('text-xs font-medium', due.tone === 'overdue' ? 'rounded-full bg-destructive/10 px-2 py-0.5 text-destructive' : 'text-muted-foreground')}>
                    {due.text}
                  </span>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                Assigned to <span className="font-medium text-foreground">{defect.contractorName}</span>
              </p>
            </div>

            {/* The rest stays tucked away until asked for */}
            <button
              type="button"
              onClick={() => setShowDetails((s) => !s)}
              aria-expanded={showDetails}
              aria-controls="defect-details"
              className="-mx-1 inline-flex h-9 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-accent"
            >
              {showDetails ? 'Hide details' : 'Show details'}
              <ChevronDown className={cn('h-4 w-4 transition-transform', showDetails && 'rotate-180')} aria-hidden="true" />
            </button>

            {showDetails && (
            <div id="defect-details" className="-mt-2 space-y-3 motion-safe:animate-in motion-safe:fade-in">
            {defect.item && defect.description && defect.description !== defect.item && (
              <p className="text-sm text-muted-foreground">{defect.description}</p>
            )}
            <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
              {defect.checklistItem?.code && (
                <Fact Icon={ListChecks} label="Checklist item" className="sm:col-span-2">
                  <span className="font-mono">{defect.checklistItem.code}</span> {defect.checklistItem.text}
                  {defect.checklistItem.section && (
                    <span className="block text-xs font-normal text-muted-foreground">{defect.checklistItem.section}</span>
                  )}
                </Fact>
              )}
              {defect.inspectionCode && (
                <Fact Icon={ClipboardCheck} label="Found in inspection">
                  {/* Contractors can't open inspection reports, so they only see the number */}
                  {user?.role === 'contractor' ? (
                    <span className="font-mono">{defect.inspectionCode}</span>
                  ) : (
                    <Link to={`/inspections?report=${defect.inspectionId}`} className="font-mono text-primary underline-offset-2 hover:underline dark:text-accent">
                      {defect.inspectionCode}
                    </Link>
                  )}
                </Fact>
              )}
              <Fact Icon={UserRound} label="Raised">
                {defect.raisedBy?.name ? `${defect.raisedBy.name} · ` : ''}{formatDate(defect.createdAt)}
              </Fact>
              {defect.location && <Fact Icon={MapPin} label="Location">{defect.location}</Fact>}
              <Fact Icon={CalendarClock} label="Due">
                {formatDate(defect.dueDate)}
                {SEVERITY_DUE_DAYS[defect.severity] !== undefined && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {severity?.label} = fix within {SEVERITY_DUE_DAYS[defect.severity]} day{SEVERITY_DUE_DAYS[defect.severity] === 1 ? '' : 's'}
                  </span>
                )}
              </Fact>
            </dl>
            </div>
            )}

            {canReassign && (
              <div className="border-t border-border/70 pt-4">
                <ReassignDefect key={defect.contractorId} defect={defect} onReassigned={handleReassigned} />
              </div>
            )}
          </section>

          <DefectHistory defectId={defect.id} refreshKey={historyKey} />
        </>
      )}
    </PageShell>
  )
}
