import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlarmClock, ArrowLeft, Building2, Filter, Mail, Phone, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Download, FilterX, Loader2, Search, SearchX, ShieldCheck, SlidersHorizontal, Wrench, X } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import StatusBadge, { PILL } from '@/components/StatusBadge'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { OfflineBanner, OfflineState, readSaved, saveCopy, useOfflineLoad } from '@/components/OfflineMode'
import DemoScenarioBar, { useScenario } from '@/prototype/DemoScenarioBar'
import PageHero, { CARD, PageShell } from '@/components/PageHero'
import { DUE_OPTIONS, REPORTED_OPTIONS, SEVERITY_META, SEVERITY_OPTIONS, STATUS_OPTIONS, dueText, formatRange, initials, matchesSearch } from './defectDisplay'
import { DueTag, SeverityPill } from './DefectPills'

// Owner: Si Qi
// Features: F02.3 grouped by contractor, F02.8 filters, F02.9 overdue, F05.4 export
// Wireframe: design/screens.md "Defects"
// Filters and search live in the URL (?contractorId=&status=&severity=&overdue=&q=) so the Overview
// counts can link straight to a filtered list. Each row links to /defects/<id> (Jerald's page).

const FILTER_KEYS = ['contractorId', 'status', 'severity', 'overdue', 'reported', 'from', 'to', 'due']
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
  const severity = SEVERITY_META[defect.severity]
  return (
    <li>
      <Link
        to={`/defects/${defect.id}`}
        className="group relative flex items-start gap-3 rounded-xl py-3 pl-5 pr-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <span className={cn('absolute bottom-3 left-1.5 top-3 w-1 rounded-full', severity.strip)} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {/* Same four lines on every row: number + due, title, lift, pills */}
          <span className="flex items-center justify-between gap-3">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground/80">{defect.code}</span>
            <DueTag defect={defect} />
          </span>
          <span className="mt-1.5 block text-[15px] font-semibold leading-snug text-foreground">{defect.item}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{defect.liftCode} · {defect.liftName}</span>
          <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <SeverityPill severity={defect.severity} />
            <StatusBadge status={defect.status} />
          </span>
        </span>
        <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  )
}

// One lift company: header toggles its defects open/closed (open by default).
// Expanded view of one company: contact details and its numbers at a glance.
function CompanyDetails({ contractor, list, onlyThis, showingOnlyThis }) {
  const today = new Date().toISOString().slice(0, 10)
  const active = list.filter((d) => d.status !== 'closed')
  const daysOld = (d) => Math.max(0, Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${d.createdAt}T00:00:00Z`)) / 86400000))
  const oldest = active.length ? Math.max(...active.map(daysOld)) : 0
  const stats = [
    { label: 'Active', value: active.length },
    { label: 'Overdue', value: list.filter((d) => dueText(d).tone === 'overdue').length, alert: true },
    { label: 'Critical', value: list.filter((d) => d.severity === 'critical' && d.status !== 'closed').length, alert: true },
    { label: 'To verify', value: list.filter((d) => d.status === 'pending_verification').length, amber: true },
  ]
  const lifts = new Set(list.map((d) => d.liftCode)).size
  return (
    <div className="mx-2 mt-2 rounded-xl border border-border/70 bg-gradient-to-br from-muted/60 to-muted/20 p-3">
      <dl className="grid grid-cols-4 gap-2">
        {stats.map((st) => (
          <div key={st.label} className="rounded-lg bg-card px-2 py-2 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-inset ring-border/70">
            <dd className={cn(
              'text-xl font-bold tabular-nums leading-none',
              st.value > 0 && st.alert ? 'text-destructive' : st.value > 0 && st.amber ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
            )}>{st.value}</dd>
            <dt className="mt-1 whitespace-nowrap text-[11px] font-medium text-muted-foreground">{st.label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" aria-hidden="true" />{lifts} {lifts === 1 ? 'lift' : 'lifts'} with defects</span>
        {active.length > 0 && <span>Oldest open: {oldest} {oldest === 1 ? 'day' : 'days'}</span>}
      </p>
      {contractor?.contactName && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5">
          <span className="mr-auto text-sm">
            <span className="block text-xs text-muted-foreground">Contact</span>
            <span className="font-semibold text-foreground">{contractor.contactName}</span>
          </span>
          {contractor.phone && (
            <a href={`tel:${contractor.phone.replace(/\s/g, '')}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-card px-3 text-xs font-semibold text-foreground ring-1 ring-inset ring-border hover:bg-muted">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              Call
            </a>
          )}
          {contractor.email && (
            <a href={`mailto:${contractor.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-card px-3 text-xs font-semibold text-foreground ring-1 ring-inset ring-border hover:bg-muted">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Email
            </a>
          )}
        </div>
      )}
      {!showingOnlyThis && (
        <button
          type="button"
          onClick={onlyThis}
          className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15 dark:text-accent"
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Show only {contractor?.name ?? 'this company'}
        </button>
      )}
    </div>
  )
}

function CompanyGroup({ name, list, open, onToggle, contractor, onlyThis, showingOnlyThis }) {
  const overdueCount = list.filter((d) => dueText(d).tone === 'overdue').length
  const panelId = `company-${name.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <section aria-label={name} className={cn(CARD, 'overflow-hidden')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
      >
        <span
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]',
            overdueCount > 0 ? 'bg-gradient-to-br from-destructive/20 to-destructive/5 text-destructive' : 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary dark:text-accent'
          )}
          aria-hidden="true"
        >
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-tight text-foreground">{name}</span>
          <span className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
            <span>{list.length} {list.length === 1 ? 'defect' : 'defects'}</span>
            {overdueCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                  <AlarmClock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  {overdueCount} overdue
                </span>
              </>
            )}
          </span>
        </span>
        <ChevronDown className={cn('h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="border-t border-border/70 pb-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
          <CompanyDetails contractor={contractor} list={list} onlyThis={onlyThis} showingOnlyThis={showingOnlyThis} />
          <ul className="divide-y divide-border/70 px-2">
            {list.map((d) => <DefectRow key={d.id} defect={d} />)}
          </ul>
        </div>
      )}
    </section>
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
  // Lift companies the admin has folded away; all open by default
  const [collapsed, setCollapsed] = useState(() => new Set())
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
    filters.reported && {
      key: 'reported',
      label: filters.reported === 'custom' ? `Reported ${formatRange(filters.from, filters.to)}` : `Reported: ${optionLabel(REPORTED_OPTIONS, filters.reported).toLowerCase()}`,
    },
    filters.due && { key: 'due', label: optionLabel(DUE_OPTIONS, filters.due) },
  ].filter(Boolean)

  // Clears the filters but keeps the search
  function clearFilters() {
    setSearchParams(q ? { q } : {}, { replace: true })
  }

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    // The From/To dates only apply to a custom reported range
    if (key === 'reported' && value !== 'custom') {
      next.delete('from')
      next.delete('to')
    }
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
          {/* Icon + count on narrow phones so the search box keeps its room */}
          <span className="sr-only sm:not-sr-only">Filters</span>
          {chips.length > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground">
              {chips.length}
            </span>
          )}
          <ChevronDown className={cn('hidden h-4 w-4 transition-transform sm:block', filtersOpen && 'rotate-180')} aria-hidden="true" />
        </button>
        </div>

        {filtersOpen && (
          <div
            id="defect-filters"
            className="grid grid-cols-2 gap-3 border-t border-border/70 pt-3 md:grid-cols-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
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
            <FilterSelect label="Reported" value={filters.reported} onChange={(v) => setFilter('reported', v)} allLabel="Any time" options={REPORTED_OPTIONS} />
            <FilterSelect label="Due" value={filters.due} onChange={(v) => setFilter('due', v)} allLabel="Any due date" options={DUE_OPTIONS} />
            {filters.reported === 'custom' && (
              <>
                <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
                  From
                  <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} className={selectClass} />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
                  To
                  <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} className={selectClass} />
                </label>
              </>
            )}
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
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-muted-foreground">
              {groups.length} lift {groups.length === 1 ? 'company' : 'companies'}
            </p>
            {collapsed.size < groups.length ? (
              <button
                type="button"
                onClick={() => setCollapsed(new Set(groups.map(([name]) => name)))}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden="true" />
                Collapse all
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed(new Set())}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                Expand all
              </button>
            )}
          </div>
          {groups.map(([name, list]) => (
            <CompanyGroup
              key={name}
              name={name}
              list={list}
              open={!collapsed.has(name)}
              contractor={contractors.find((c) => c.name === name) ?? { name, id: list[0].contractorId }}
              showingOnlyThis={filters.contractorId === String(list[0].contractorId)}
              onlyThis={() => setFilter('contractorId', String(list[0].contractorId))}
              onToggle={() => setCollapsed((prev) => {
                const next = new Set(prev)
                if (next.has(name)) next.delete(name)
                else next.add(name)
                return next
              })}
            />
          ))}
        </div>
      )}

      {/* Prototype-only demo controls, kept out of the way at the bottom */}
      <DemoScenarioBar className="bg-card/70 backdrop-blur" />
    </PageShell>
  )
}
