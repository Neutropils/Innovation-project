import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, Download, FilterX, Loader2, Search, SearchX, ShieldCheck, SlidersHorizontal, Wrench, X } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { OfflineBanner, OfflineState, readSaved, saveCopy, useOfflineLoad } from '@/components/OfflineMode'
import DemoScenarioBar, { useScenario } from '@/prototype/DemoScenarioBar'
import PageHero, { CARD, PageShell } from '@/components/PageHero'
import { SEVERITY_META, SEVERITY_OPTIONS, STATUS_OPTIONS, dueText, initials, matchesSearch } from './defectDisplay'

// Owner: Si Qi
// Features: F02.3 grouped by contractor, F02.8 filters, F02.9 overdue, F05.4 export
// Wireframe: design/screens.md "Defects"
// Filters and search live in the URL (?contractorId=&status=&severity=&overdue=&q=) so the Overview
// counts can link straight to a filtered list. Each row links to /defects/<id> (Jerald's page).

const FILTER_KEYS = ['contractorId', 'status', 'severity', 'overdue']
// Search (?q=) runs on the loaded list, so it is instant and also works offline.

const selectClass =
  'h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function FilterSelect({ label, value, onChange, options, allLabel }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function DefectRow({ defect }) {
  const due = dueText(defect)
  const severity = SEVERITY_META[defect.severity]
  return (
    <li>
      <Link
        to={`/defects/${defect.id}`}
        className="group relative flex items-start gap-3 rounded-xl py-3 pl-5 pr-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <span className={cn('absolute bottom-3 left-1.5 top-3 w-1 rounded-full', severity.strip)} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-mono font-medium text-foreground/80">{defect.code}</span>
            <span aria-hidden="true">·</span>
            <span>{defect.liftCode} {defect.liftName}</span>
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-foreground">{defect.item}</span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', severity.className)}>{severity.label}</span>
            <StatusBadge status={defect.status} />
            {due.text && (
            <span
              className={cn(
                'text-xs font-medium',
                due.tone === 'overdue' && 'rounded-full bg-destructive/10 px-2 py-0.5 text-destructive',
                due.tone === 'soon' && 'text-accent',
                (due.tone === 'normal' || due.tone === 'muted') && 'text-muted-foreground'
              )}
            >
              {due.text}
            </span>
            )}
          </span>
        </span>
        <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1].map((g) => (
        <div key={g} className={cn(CARD, "p-4")}>
          <span className="block h-4 w-32 animate-pulse rounded bg-muted" />
          {[0, 1, 2].map((r) => (
            <span key={r} className="mt-4 block space-y-2">
              <span className="block h-3 w-40 animate-pulse rounded bg-muted" />
              <span className="block h-4 w-56 animate-pulse rounded bg-muted" />
              <span className="block h-4 w-36 animate-pulse rounded bg-muted" />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function downloadCsv(text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `elev8-defects-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function DefectsPage() {
  const scenario = useScenario()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? '']))
  const filterKey = FILTER_KEYS.map((k) => filters[k]).join('|')
  const hasFilters = FILTER_KEYS.some((k) => filters[k])
  const q = searchParams.get('q') ?? ''
  const searching = q.trim() !== ''

  const [contractors, setContractors] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const fetchDefects = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    return api.get('/defects', { params }).then((res) => res.data.data)
    // filterKey captures every filter value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])
  // Offline mode: each filter combination opened online is saved and shown again offline
  const [loadState, load] = useOfflineLoad(`defects:${filterKey}`, fetchDefects)
  const defects = useMemo(() => (loadState.data ?? []).filter((d) => matchesSearch(d, q)), [loadState.data, q])
  const state = { ...loadState, defects }
  const offline = Boolean(state.savedAt) || state.status === 'offline'

  useEffect(() => { load() }, [load, scenario])

  useEffect(() => {
    api.get('/contractors')
      .then((res) => {
        const list = res.data.data ?? []
        saveCopy('contractors', list)
        setContractors(list)
      })
      .catch(() => setContractors(readSaved('contractors')?.data ?? []))
  }, [scenario])

  // Back to wherever the admin came from (usually an Overview count); Overview if opened directly.
  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/overview')
  }

  // Active filters as removable chips, shown under the search box
  const optionLabel = (options, value) => options.find((o) => o.value === value)?.label ?? value
  const chips = [
    filters.contractorId && { key: 'contractorId', label: contractors.find((c) => String(c.id) === filters.contractorId)?.name ?? 'Contractor' },
    filters.status && { key: 'status', label: optionLabel(STATUS_OPTIONS, filters.status) },
    filters.severity && { key: 'severity', label: optionLabel(SEVERITY_OPTIONS, filters.severity) },
    filters.overdue === 'true' && { key: 'overdue', label: 'Overdue only' },
  ].filter(Boolean)

  // Clears the filters but keeps the search
  function clearFilters() {
    setSearchParams(q ? { q } : {}, { replace: true })
  }

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  async function exportCsv() {
    setExportError('')
    setExporting(true)
    try {
      // Export what's on screen: the filters plus the search
      const params = Object.fromEntries(Object.entries({ ...filters, q: q.trim() }).filter(([, v]) => v))
      const res = await api.get('/defects/export', { params, responseType: 'text' })
      downloadCsv(typeof res.data === 'string' ? res.data : String(res.data))
    } catch {
      setExportError('Export failed. Try again in a moment.')
    } finally {
      setExporting(false)
    }
  }

  // F02.3: group by contractor, biggest backlog first
  const groups = useMemo(() => {
    const byName = new Map()
    for (const d of state.defects) {
      if (!byName.has(d.contractorName)) byName.set(d.contractorName, [])
      byName.get(d.contractorName).push(d)
    }
    return [...byName.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [state.defects])

  const total = state.defects.length
  const matchText = searching
    ? (hasFilters ? ' match your search and filters' : ' match your search')
    : (hasFilters ? ' match your filters' : '')

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
        Icon={Wrench}
        eyebrow="All lift companies"
        title="Defects"
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || offline || state.status !== 'ready' || total === 0}
            title={offline ? 'Export needs a connection' : undefined}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            Export CSV
          </button>
        }
      >
        <p aria-live="polite">
          {state.status === 'ready' ? `${total} defect${total === 1 ? '' : 's'}${matchText}` : 'Grouped by lift company'}
        </p>
      </PageHero>
      {exportError && <p role="alert" className="-mt-3 text-sm text-destructive">{exportError}</p>}

      {/* F02.8 filters */}
      <section aria-label="Filters" className={cn(CARD, "space-y-3 p-3")}>
        <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setFilter('q', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setFilter('q', '') }}
            aria-label="Search defects"
            placeholder="Search defects"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => setFilter('q', '')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-controls="defect-filters"
          className={cn(
            'inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            filtersOpen ? 'border-primary/40 bg-primary/10 text-primary dark:text-accent' : 'border-border bg-card text-foreground hover:bg-muted'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
          {chips.length > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground">
              {chips.length}
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 transition-transform', filtersOpen && 'rotate-180')} aria-hidden="true" />
        </button>
        </div>

        {filtersOpen && (
          <div
            id="defect-filters"
            className="grid grid-cols-2 gap-3 border-t border-border/70 pt-3 md:grid-cols-[1fr_1fr_1fr_auto] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
          >
            <div className="col-span-2 md:col-span-1">
              <FilterSelect
                label="Contractor"
                value={filters.contractorId}
                onChange={(v) => setFilter('contractorId', v)}
                allLabel="All contractors"
                options={contractors.map((c) => ({ value: String(c.id), label: c.name }))}
              />
            </div>
            <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilter('status', v)} allLabel="All statuses" options={STATUS_OPTIONS} />
            <FilterSelect label="Severity" value={filters.severity} onChange={(v) => setFilter('severity', v)} allLabel="All severities" options={SEVERITY_OPTIONS} />
            <div className="col-span-2 flex items-end md:col-span-1">
              <button
                type="button"
                aria-pressed={filters.overdue === 'true'}
                onClick={() => setFilter('overdue', filters.overdue === 'true' ? '' : 'true')}
                className={cn(
                  'inline-flex h-10 flex-1 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors md:flex-none',
                  filters.overdue === 'true'
                    ? 'border-destructive bg-destructive text-destructive-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                )}
              >
                Overdue only
              </button>
            </div>
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key, '')}
                aria-label={`Remove filter: ${chip.label}`}
                className={cn(
                  'inline-flex h-8 items-center gap-1 rounded-full pl-3 pr-2 text-xs font-semibold ring-1 ring-inset transition-colors',
                  chip.key === 'overdue'
                    ? 'bg-destructive/10 text-destructive ring-destructive/25 hover:bg-destructive/15'
                    : 'bg-primary/10 text-primary ring-primary/20 hover:bg-primary/15 dark:text-accent'
                )}
              >
                {chip.label}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all
            </button>
          </div>
        )}
      </section>

      {state.status === 'loading' && <ListSkeleton />}

      {state.savedAt && <OfflineBanner savedAt={state.savedAt} what="defects" onRetry={load} retrying={state.retrying} />}

      {state.status === 'offline' && (
        <OfflineState
          message={hasFilters
            ? 'These filters haven’t been opened online yet, so nothing is saved for them. Clear the filters to see the saved list, or reconnect.'
            : undefined}
          onRetry={load}
          retrying={state.retrying}
        />
      )}

      {state.status === 'error' && (
        <ErrorState title="Couldn’t load defects" message="Something went wrong on our side. Try again in a moment." onRetry={load} />
      )}

      {state.status === 'ready' && total === 0 && (
        searching ? (
          <EmptyState
            Icon={SearchX}
            title={`No results for “${q.trim()}”`}
            message={hasFilters
              ? 'Nothing matches with the current filters. Check the spelling, or clear the search.'
              : 'Check the spelling, or search by defect number, lift code, item or contractor.'}
            action={
              <button type="button" onClick={() => setFilter('q', '')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <X className="h-4 w-4" aria-hidden="true" />
                Clear search
              </button>
            }
          />
        ) : hasFilters ? (
          <EmptyState
            Icon={SearchX}
            title="No defects match these filters"
            message="Try a different contractor, status or severity."
            action={
              <button type="button" onClick={() => setSearchParams({}, { replace: true })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <FilterX className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            Icon={ShieldCheck}
            title="No defects yet"
            message="When an inspection fails an item, the defect appears here, assigned to the lift’s contractor."
          />
        )
      )}

      {state.status === 'ready' && total > 0 && (
        <div className="space-y-4">
          {groups.map(([name, list]) => {
            const overdueCount = list.filter((d) => dueText(d).tone === 'overdue').length
            return (
            <section key={name} aria-label={name} className={cn(CARD, "p-2")}>
              <div className="flex items-center gap-3 border-b border-border/70 px-3 pb-3 pt-2">
                <span
                  className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                    overdueCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary dark:text-accent'
                  )}
                  aria-hidden="true"
                >
                  {initials(name)}
                </span>
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</h2>
                {overdueCount > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-destructive ring-1 ring-inset ring-destructive/20">
                    {overdueCount} overdue
                  </span>
                )}
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">{list.length}</span>
              </div>
              <ul className="divide-y divide-border/70">
                {list.map((d) => <DefectRow key={d.id} defect={d} />)}
              </ul>
            </section>
            )
          })}
        </div>
      )}
      {/* Prototype-only demo controls, kept out of the way at the bottom */}
      <DemoScenarioBar className="bg-card/70 backdrop-blur" />
    </PageShell>
  )
}
