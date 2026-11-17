import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Check, ChevronRight, ClipboardCheck, Download, History, Plus, SearchX, X } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks'
import PageHero, { CARD, PageShell } from '@/components/PageHero'
import { EmptyState, ErrorState } from '@/components/StateViews'
import LiftPickerDialog from './LiftPickerDialog'
import {
  ACTION_OUTLINE, ACTION_PRIMARY, FIELD, downloadInspectionsCsv, errorMessage, filterParams, formatDay, formatDayTime, plural,
} from './inspectionDisplay'

// Owner: Kandha
// Features: F01.11 history (filters, role-aware), F05.3 CSV export, entry point for new inspections
// Wireframe: design/screens.md "Inspection history and report"
//
// Filters live in the URL query string (?tab=&liftId=&from=&to=&result=) so Back keeps them.
// Inspectors get a Drafts tab (their own unsent inspections); admins only see submitted ones.

const RESULT_OPTIONS = [
  { value: '', label: 'Any result' },
  { value: 'defect', label: 'With defects' },
  { value: 'pass', label: 'All pass' },
]

function ResultPill({ inspection }) {
  if (inspection.status === 'draft') {
    return <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">Draft</span>
  }
  return inspection.defectCount > 0 ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive ring-1 ring-inset ring-destructive/30">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      {plural(inspection.defectCount, 'defect')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-400">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      All pass
    </span>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => <span key={i} className="block h-16 animate-pulse rounded-2xl bg-muted" />)}
    </div>
  )
}

// One list (submitted or drafts): a table from md up, stacked cards on a phone
function InspectionList({ rows, drafts }) {
  const navigate = useNavigate()
  const open = (r) => navigate(`/inspections/${r.id}`)
  return (
    <>
      <div className={cn(CARD, 'hidden overflow-x-auto md:block')}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Inspection</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Lift</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Contractor</th>
              {!drafts && <th scope="col" className="px-4 py-2.5 font-semibold">Inspector</th>}
              <th scope="col" className="px-4 py-2.5 font-semibold">{drafts ? 'Started' : 'Date'}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{drafts ? 'Progress' : 'Result'}</th>
              {drafts && <th scope="col" className="px-4 py-2.5"><span className="sr-only">Continue</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} onClick={() => open(r)} className="cursor-pointer hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link to={`/inspections/${r.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-h-[44px] items-center font-mono font-medium text-primary underline-offset-2 hover:underline dark:text-accent">{r.displayId}</Link>
                </td>
                <td className="px-4 py-3"><span className="font-medium text-foreground">{r.liftCode}</span><span className="block text-xs text-muted-foreground">{r.address}</span></td>
                <td className="px-4 py-3">{r.contractorName ?? '-'}</td>
                {!drafts && <td className="px-4 py-3">{r.inspectorName ?? '-'}</td>}
                <td className="whitespace-nowrap px-4 py-3">{drafts ? formatDayTime(r.createdAt) : formatDay(r.submittedAt)}</td>
                <td className="px-4 py-3">{drafts ? `${r.answeredCount}/${r.totalItems} answered` : <ResultPill inspection={r} />}</td>
                {drafts && (
                  <td className="px-4 py-3 text-right">
                    <Link to={`/inspections/${r.id}`} onClick={(e) => e.stopPropagation()} className={cn(ACTION_PRIMARY, 'h-11')}>Continue</Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={`/inspections/${r.id}`} className={cn(CARD, 'block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-primary dark:text-accent">{r.displayId}</span>
                {drafts ? <span className="text-xs font-semibold text-muted-foreground">{r.answeredCount}/{r.totalItems} answered</span> : <ResultPill inspection={r} />}
              </div>
              <p className="mt-1 font-medium text-foreground">{r.liftCode}</p>
              <p className="text-sm text-muted-foreground">{r.address}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {r.contractorName ?? '-'}{!drafts && ` · ${r.inspectorName ?? '-'}`}
              </p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{drafts ? `Started ${formatDayTime(r.createdAt)}` : formatDay(r.submittedAt)}</span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-primary dark:text-accent">
                  {drafts ? 'Continue' : 'Open'}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function InspectionHistoryPage() {
  const { user } = useAuth()
  const isInspector = user?.role === 'inspector'
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = isInspector && searchParams.get('tab') === 'drafts' ? 'drafts' : 'submitted'
  const filters = useMemo(() => ({
    liftId: searchParams.get('liftId') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
    result: searchParams.get('result') ?? '',
  }), [searchParams])
  const hasFilters = Object.values(filters).some(Boolean)

  const [submitted, setSubmitted] = useState({ status: 'loading', rows: [] })
  const [drafts, setDrafts] = useState({ status: 'loading', rows: [] })
  const [lifts, setLifts] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const loadSubmitted = useCallback(() => {
    setSubmitted((s) => ({ ...s, status: 'loading' }))
    api.get('/inspections', { params: { status: 'submitted', ...filterParams(filters) } })
      .then((res) => setSubmitted({ status: 'ready', rows: res.data.data ?? [] }))
      .catch((err) => setSubmitted({ status: 'error', rows: [], message: errorMessage(err) }))
  }, [filters])

  const loadDrafts = useCallback(() => {
    if (!isInspector) return
    api.get('/inspections', { params: { status: 'draft' } })
      .then((res) => setDrafts({ status: 'ready', rows: res.data.data ?? [] }))
      .catch((err) => setDrafts({ status: 'error', rows: [], message: errorMessage(err) }))
  }, [isInspector])

  useEffect(() => { loadSubmitted() }, [loadSubmitted])
  useEffect(() => { loadDrafts() }, [loadDrafts])

  // The lift filter's options come from Kwan's register; without them the filter just shows "All lifts"
  useEffect(() => {
    api.get('/lifts').then((res) => setLifts(res.data.data ?? [])).catch(() => {})
  }, [])

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }
  const clearFilters = () => {
    const next = new URLSearchParams()
    if (tab === 'drafts') next.set('tab', 'drafts')
    setSearchParams(next)
  }

  async function exportCsv() {
    setExporting(true)
    setExportError('')
    try {
      await downloadInspectionsCsv(api, filterParams(filters))
    } catch (err) {
      setExportError(errorMessage(err, 'Couldn’t export. Check your connection and try again.'))
    } finally {
      setExporting(false)
    }
  }

  const liftOptions = lifts.filter((l) => l.isActive !== false)
  const draftCount = drafts.rows.length

  const tabClass = (active) => cn(
    'inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

  return (
    <PageShell>
      <PageHero
        Icon={History}
        eyebrow={isInspector ? 'Spot-checks' : 'Inspection records'}
        title="Inspections"
        actions={isInspector && (
          <button type="button" onClick={() => setPickerOpen(true)} className={ACTION_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New inspection
          </button>
        )}
      >
        <p aria-live="polite">
          {tab === 'drafts'
            ? `${plural(draftCount, 'draft')} waiting for you`
            : submitted.status === 'ready' ? `${plural(submitted.rows.length, 'inspection')}${hasFilters ? ' match your filters' : ''}` : 'Past spot-checks and their reports'}
        </p>
      </PageHero>

      {isInspector && (
        <div role="tablist" aria-label="Inspection lists" className="flex gap-1 rounded-xl bg-muted/60 p-1 sm:w-fit">
          <button type="button" role="tab" id="tab-drafts" aria-selected={tab === 'drafts'} aria-controls="panel" onClick={() => setParam('tab', 'drafts')} className={cn(tabClass(tab === 'drafts'), 'flex-1')}>
            Drafts ({draftCount})
          </button>
          <button type="button" role="tab" id="tab-submitted" aria-selected={tab === 'submitted'} aria-controls="panel" onClick={() => setParam('tab', '')} className={cn(tabClass(tab === 'submitted'), 'flex-1')}>
            Submitted
          </button>
        </div>
      )}

      <div id="panel" role={isInspector ? 'tabpanel' : undefined} aria-labelledby={isInspector ? `tab-${tab}` : undefined} className="space-y-4">
        {tab === 'submitted' && (
          <>
            <div className={cn(CARD, 'p-3')}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1">
                  <label htmlFor="f-lift" className="mb-1 block text-xs font-semibold text-muted-foreground">Lift</label>
                  <select id="f-lift" value={filters.liftId} onChange={(e) => setParam('liftId', e.target.value)} className={FIELD}>
                    <option value="">All lifts</option>
                    {filters.liftId && !liftOptions.some((l) => String(l.id) === filters.liftId) && <option value={filters.liftId}>Lift {filters.liftId}</option>}
                    {liftOptions.map((l) => <option key={l.id} value={l.id}>{l.liftCode}{l.street ? ` - Blk ${l.block} ${l.street}` : ''}</option>)}
                  </select>
                </div>
                <div className="min-w-[8.5rem] flex-1">
                  <label htmlFor="f-from" className="mb-1 block text-xs font-semibold text-muted-foreground">From</label>
                  <input id="f-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setParam('from', e.target.value)} className={FIELD} />
                </div>
                <div className="min-w-[8.5rem] flex-1">
                  <label htmlFor="f-to" className="mb-1 block text-xs font-semibold text-muted-foreground">To</label>
                  <input id="f-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setParam('to', e.target.value)} className={FIELD} />
                </div>
                <div className="min-w-[8.5rem] flex-1">
                  <label htmlFor="f-result" className="mb-1 block text-xs font-semibold text-muted-foreground">Result</label>
                  <select id="f-result" value={filters.result} onChange={(e) => setParam('result', e.target.value)} className={FIELD}>
                    {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {hasFilters && (
                  <button type="button" onClick={clearFilters} className={ACTION_OUTLINE}>
                    <X className="h-4 w-4" aria-hidden="true" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {exportError && <p role="alert" className="mr-auto text-sm font-medium text-destructive">{exportError}</p>}
              <button type="button" onClick={exportCsv} disabled={exporting || submitted.status !== 'ready' || submitted.rows.length === 0} className={ACTION_OUTLINE}>
                <Download className="h-4 w-4" aria-hidden="true" />
                {exporting ? 'Exporting…' : `Export CSV (${submitted.status === 'ready' ? submitted.rows.length : 0})`}
              </button>
            </div>

            {submitted.status === 'loading' && <ListSkeleton />}
            {submitted.status === 'error' && <ErrorState title="Couldn’t load the inspections" message={submitted.message} onRetry={loadSubmitted} />}
            {submitted.status === 'ready' && submitted.rows.length === 0 && (
              hasFilters ? (
                <EmptyState
                  Icon={SearchX}
                  title="No inspections match these filters"
                  message="Try a wider date range or another lift."
                  action={<button type="button" onClick={clearFilters} className={ACTION_PRIMARY}><X className="h-4 w-4" aria-hidden="true" />Clear filters</button>}
                />
              ) : (
                <EmptyState
                  Icon={ClipboardCheck}
                  title="No inspections yet"
                  message={isInspector ? 'Start one from New inspection. Submitted spot-checks appear here.' : 'Submitted spot-checks appear here once inspectors send them in.'}
                  action={isInspector && <button type="button" onClick={() => setPickerOpen(true)} className={ACTION_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" />New inspection</button>}
                />
              )
            )}
            {submitted.status === 'ready' && submitted.rows.length > 0 && <InspectionList rows={submitted.rows} drafts={false} />}
          </>
        )}

        {tab === 'drafts' && (
          <>
            {drafts.status === 'loading' && <ListSkeleton />}
            {drafts.status === 'error' && <ErrorState title="Couldn’t load your drafts" message={drafts.message} onRetry={loadDrafts} />}
            {drafts.status === 'ready' && drafts.rows.length === 0 && (
              <EmptyState
                Icon={ClipboardCheck}
                title="No drafts"
                message="An inspection you start and don’t finish is kept here, so you can carry on later."
                action={<button type="button" onClick={() => setPickerOpen(true)} className={ACTION_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" />New inspection</button>}
              />
            )}
            {drafts.status === 'ready' && drafts.rows.length > 0 && <InspectionList rows={drafts.rows} drafts />}
          </>
        )}
      </div>

      {pickerOpen && <LiftPickerDialog onClose={() => setPickerOpen(false)} />}
    </PageShell>
  )
}
