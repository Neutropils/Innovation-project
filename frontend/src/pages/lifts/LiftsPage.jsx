import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Building2, ChevronRight, ClipboardCheck, History, MapPin, Pencil, Play, Search, SearchX, Sparkles, Upload, X } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks'
import PageHero, { CARD, PageShell } from '@/components/PageHero'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { OfflineBanner, OfflineState, useOfflineLoad } from '@/components/OfflineMode'
import DemoScenarioBar, { useScenario } from '@/prototype/DemoScenarioBar'
import { lastCheckText, mapsUrl, matchesLift, suggestedLifts } from './liftDisplay'

// Owner: Kwan
// Features: F01.1 lift search, F01.2 lift details, F01.13 map link - inspector home
// Wireframe: design/screens.md "Lifts"
//
// CONTRACT with Kandha: "Start inspection" navigates to /inspections/new?liftId=<id>.
// Kandha's page creates the draft, so this page never calls the inspections API.
//
// Search (?q=) runs on the loaded list, so it is instant and still works offline.

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// 44px tall: touch-sized for use on site
const ACTION =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
const ACTION_PRIMARY = cn(ACTION, 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90')
const ACTION_OUTLINE = cn(ACTION, 'border border-border bg-card text-foreground shadow-sm hover:bg-muted')

const REASON_TONES = {
  danger: 'bg-destructive/10 text-destructive ring-destructive/25',
  warn: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-400',
  info: 'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300',
}

function LiftCard({ lift, reasons, canInspect }) {
  return (
    <li className={cn(CARD, 'p-4')}>
      <p className="font-mono text-xs font-medium text-foreground/80">{lift.liftCode}</p>
      <h3 className="mt-0.5 text-base font-semibold text-foreground">{lift.liftName}</h3>
      <p className="text-sm text-muted-foreground">{[lift.street, lift.town].filter(Boolean).join(', ')}</p>

      {reasons?.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <span key={r.text} className={cn('rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', REASON_TONES[r.tone])}>
              {r.text}
            </span>
          ))}
        </p>
      )}

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-24 flex-shrink-0 text-muted-foreground">Contractor</dt>
          <dd className="min-w-0 font-medium text-foreground">{lift.contractorName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 flex-shrink-0 text-muted-foreground">Last check</dt>
          <dd className="min-w-0 text-foreground">{lastCheckText(lift)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 flex-shrink-0 text-muted-foreground">Defects</dt>
          <dd className="min-w-0">
            {lift.openDefects > 0 ? (
              <Link
                to={`/defects?q=${encodeURIComponent(lift.liftCode)}&status=active`}
                className="inline-flex flex-wrap items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline dark:text-accent"
              >
                {lift.openDefects} open
                {lift.overdueDefects > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive ring-1 ring-inset ring-destructive/25">
                    {lift.overdueDefects} overdue
                  </span>
                )}
              </Link>
            ) : (
              <span className="text-muted-foreground">None open</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canInspect ? (
          <Link to={`/inspections/new?liftId=${lift.id}`} className={cn(ACTION_PRIMARY, 'flex-1 sm:flex-none')} aria-label={`Start inspection of ${lift.liftCode}`}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Start inspection
          </Link>
        ) : (
          // Admins manage the record; only inspectors can start an inspection.
          <Link to={`/admin?tab=lifts&q=${encodeURIComponent(lift.liftCode)}`} className={cn(ACTION_PRIMARY, 'flex-1 sm:flex-none')} aria-label={`Edit ${lift.liftCode}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        )}
        <Link to={`/inspections?liftId=${lift.id}`} className={ACTION_OUTLINE} aria-label={`History of ${lift.liftCode}`}>
          <History className="h-4 w-4" aria-hidden="true" />
          History
        </Link>
        <a
          href={mapsUrl(lift)}
          target="_blank"
          rel="noreferrer"
          className={cn(ACTION, 'px-2 text-muted-foreground hover:text-foreground')}
          aria-label={`Find ${lift.liftCode} in map`}
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Map
        </a>
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cn(CARD, 'space-y-3 p-4')}>
          <span className="block h-3 w-20 animate-pulse rounded bg-muted" />
          <span className="block h-4 w-36 animate-pulse rounded bg-muted" />
          <span className="block h-3 w-48 animate-pulse rounded bg-muted" />
          <span className="block h-11 w-40 animate-pulse rounded-xl bg-muted" />
        </div>
      ))}
    </div>
  )
}

export default function LiftsPage() {
  const scenario = useScenario()
  const { user } = useAuth()
  const canInspect = user?.role === 'inspector'
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const searching = q.trim() !== ''

  const fetchLifts = useCallback(() => api.get('/lifts').then((res) => res.data.data), [])
  // Offline mode: the last loaded list stays on screen with a banner
  const [state, load] = useOfflineLoad('lifts', fetchLifts)
  useEffect(() => { load() }, [load, scenario])

  // Deactivated lifts stay in the Admin register but are not offered for inspection
  const active = useMemo(() => (state.data ?? []).filter((l) => l.isActive), [state.data])
  const lifts = useMemo(() => active.filter((l) => matchesLift(l, q)), [active, q])
  const suggested = useMemo(() => (searching ? [] : suggestedLifts(active)), [active, searching])
  const toVerify = active.reduce((sum, l) => sum + l.pendingVerification, 0)

  function setSearch(value) {
    setSearchParams(value ? { q: value } : {}, { replace: true })
  }

  const summary = state.status !== 'ready'
    ? 'Find a lift to spot-check'
    : searching
      ? `${plural(lifts.length, 'lift')} match your search`
      : `${plural(active.length, 'lift')} in the register`

  return (
    <PageShell>
      <PageHero Icon={Building2} eyebrow={canInspect ? 'Spot-checks' : 'Lift register'} title="Lifts">
        <p aria-live="polite">{summary}</p>
      </PageHero>

      <div className={cn(CARD, 'p-3')}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSearch('') }}
            aria-label="Search lifts"
            placeholder="Search lift ID, block or street"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {state.savedAt && <OfflineBanner savedAt={state.savedAt} what="lifts" onRetry={load} retrying={state.retrying} />}

      {state.status === 'loading' && <ListSkeleton />}

      {state.status === 'offline' && <OfflineState onRetry={load} retrying={state.retrying} />}

      {state.status === 'error' && (
        <ErrorState title="Couldn’t load the lifts" message="Something went wrong on our side. Try again in a moment." onRetry={load} />
      )}

      {state.status === 'ready' && active.length === 0 && (
        <EmptyState
          Icon={Building2}
          title="No lifts in the register yet"
          message={canInspect
            ? 'Ask your EMS admin to add or import the lifts. They appear here as soon as they are added.'
            : 'Import your lift list from a spreadsheet, or add lifts one at a time.'}
          action={!canInspect && (
            <Link to="/admin?tab=import" className={ACTION_PRIMARY}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import lifts
            </Link>
          )}
        />
      )}

      {state.status === 'ready' && active.length > 0 && lifts.length === 0 && (
        <EmptyState
          Icon={SearchX}
          title={`No lifts match “${q.trim()}”`}
          message="Check the spelling, or search by lift ID, block, street or contractor."
          action={
            <button type="button" onClick={() => setSearch('')} className={ACTION_PRIMARY}>
              <X className="h-4 w-4" aria-hidden="true" />
              Clear search
            </button>
          }
        />
      )}

      {state.status === 'ready' && lifts.length > 0 && (
        <>
          {toVerify > 0 && !searching && (
            <Link
              to="/defects?status=pending_verification"
              className={cn(CARD, 'group flex items-center gap-3 border-violet-500/30 p-3 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{plural(toVerify, 'repair')} waiting for you</span>
                <span className="block text-xs text-muted-foreground">Contractors have signed off. Approve or reject each repair.</span>
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          )}

          {suggested.length > 0 && (
            <section aria-labelledby="suggested">
              <div className="mb-2 flex items-center gap-2 px-1">
                <Sparkles className="h-4 w-4 text-primary dark:text-accent" aria-hidden="true" />
                <h2 id="suggested" className="text-base font-semibold text-foreground">Suggested next checks</h2>
              </div>
              <p className="mb-3 px-1 text-xs text-muted-foreground">
                Ranked by time since the last check, overdue defects and repairs waiting to be verified.
              </p>
              <ul className="grid gap-3 md:grid-cols-2">
                {suggested.map(({ lift, reasons }) => (
                  <LiftCard key={lift.id} lift={lift} reasons={reasons} canInspect={canInspect} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="all-lifts">
            <h2 id="all-lifts" className="mb-3 px-1 text-base font-semibold text-foreground">
              {searching ? 'Search results' : 'All lifts'}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {lifts.map((lift) => <LiftCard key={lift.id} lift={lift} canInspect={canInspect} />)}
            </ul>
          </section>
        </>
      )}

      {/* Prototype-only demo controls, kept out of the way at the bottom */}
      <DemoScenarioBar className="bg-card/70 backdrop-blur" />
    </PageShell>
  )
}
