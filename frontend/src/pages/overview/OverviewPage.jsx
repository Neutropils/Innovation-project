import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, ClipboardCheck, History, LayoutDashboard, ShieldCheck, Wrench } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import PageHero, { CARD, PageShell } from '@/components/PageHero'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { OfflineBanner, OfflineState, useOfflineLoad } from '@/components/OfflineMode'
import { initials } from '@/pages/defects/defectDisplay'
import DemoScenarioBar, { useScenario } from '@/prototype/DemoScenarioBar'

// Owner: Si Qi
// Features: F08.1-F08.4 open, overdue, pending-verification and inspection counts, by contractor - admin home
// Wireframe: design/screens.md "Overview". Counts, plus small bars per contractor (no full charts).
// Overview answers "how are we doing and who needs chasing"; the Defects page is the full
// working list. Every count links to the Defects page with the matching filter.

const PERIODS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

function greeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// One-line summary under the title, so the admin knows what to do first.
function headline(data) {
  if (!data) return 'Defects across every lift company'
  const behind = data.byContractor.filter((c) => c.overdue > 0).sort((a, b) => b.overdue - a.overdue)
  if (data.overdue > 0 && behind.length > 0) {
    return `${data.overdue} overdue across ${plural(behind.length, 'contractor')} - ${behind[0].name} needs chasing first.`
  }
  if (data.pendingVerification > 0) return `Nothing overdue. ${plural(data.pendingVerification, 'repair')} waiting for you to verify.`
  if (data.open > 0) return `${plural(data.open, 'open defect')}, none overdue. Contractors are on track.`
  return 'Nothing open this period. Every lift is clear.'
}

const TONES = {
  primary: { chip: 'bg-primary/10 text-primary dark:text-accent', glow: 'bg-primary/15', border: 'border-border', value: 'text-foreground' },
  danger:  { chip: 'bg-destructive/10 text-destructive', glow: 'bg-destructive/20', border: 'border-destructive/30', value: 'text-destructive' },
  amber:   { chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', glow: 'bg-amber-400/25', border: 'border-amber-500/40', value: 'text-amber-600 dark:text-amber-400' },
}

// Coloured tones only light up when there is something to act on.
function Tile({ to, label, value, Icon, tone = 'primary', hint }) {
  const t = TONES[value > 0 ? tone : 'primary']
  return (
    <Link
      to={to}
      className={cn(
        CARD,
        'group relative isolate flex flex-col overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        t.border
      )}
    >
      <span className={cn('pointer-events-none absolute -right-10 -top-10 -z-10 h-28 w-28 rounded-full blur-2xl', t.glow)} aria-hidden="true" />
      <Icon className={cn('pointer-events-none absolute -bottom-4 -right-3 -z-10 h-24 w-24 opacity-[0.06]', t.value)} strokeWidth={1.5} aria-hidden="true" />
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', t.chip)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </span>
      <span className={cn('mt-4 text-4xl font-bold tabular-nums tracking-tight', t.value)}>{value}</span>
      <span className="mt-2 flex items-center gap-0.5 text-sm font-semibold text-foreground/80 group-hover:text-foreground">
        {hint}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}

function TileSkeleton() {
  return <div className={cn(CARD, 'h-[148px] animate-pulse')} aria-hidden="true" />
}

// Every number gets the same bubble; overdue turns red only when it's above 0.
function CountBubble({ value, label, alert }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 min-w-[2.75rem] items-center justify-center rounded-full bg-gradient-to-b px-2.5 text-base font-bold tabular-nums ring-1 ring-inset shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none',
        alert ? 'from-destructive/20 to-destructive/5 text-destructive ring-destructive/30' : 'from-muted to-muted/40 text-foreground/80 ring-border'
      )}
    >
      {value}
      <span className="sr-only"> {label}</span>
    </span>
  )
}

// Small bar: open defects relative to the busiest contractor, overdue part in red.
function LoadBar({ open, overdue, max }) {
  const pct = (n) => (max > 0 ? Math.max((n / max) * 100, n > 0 ? 4 : 0) : 0)
  return (
    <span className="mt-1.5 flex h-2 w-full max-w-[12rem] gap-0.5 overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]" aria-hidden="true">
      <span className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400" style={{ width: `${pct(overdue)}%` }} />
      <span className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary/50 dark:from-accent dark:to-accent/60" style={{ width: `${pct(open - overdue)}%` }} />
    </span>
  )
}

function ContractorRow({ c, max }) {
  return (
    <li>
      <Link
        to={`/defects?contractorId=${c.contractorId}&status=active`}
        className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <span
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold',
            c.overdue > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary dark:text-accent'
          )}
          aria-hidden="true"
        >
          {initials(c.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-base font-semibold leading-snug text-foreground">{c.name}</span>
          <LoadBar open={c.open} overdue={c.overdue} max={max} />
        </span>
        <CountBubble value={c.open} label="open" />
        <CountBubble value={c.overdue} label="overdue" alert={c.overdue > 0} />
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  )
}

export default function OverviewPage() {
  const scenario = useScenario()
  const { user } = useAuth()
  const [period, setPeriod] = useState('month')

  const fetchOverview = useCallback(
    () => api.get('/overview', { params: { period } }).then((res) => res.data.data),
    [period]
  )
  // Offline mode: shows the last saved counts with a banner instead of an error
  const [state, load] = useOfflineLoad(`overview:${period}`, fetchOverview)

  useEffect(() => { load() }, [load, scenario])

  const data = state.data
  const nothingOpen = data && data.open === 0 && data.overdue === 0 && data.pendingVerification === 0
  // Who needs chasing first: most overdue, then biggest backlog
  const contractors = data ? [...data.byContractor].sort((a, b) => b.overdue - a.overdue || b.open - a.open) : []
  const maxOpen = Math.max(0, ...contractors.map((c) => c.open))
  const firstName = user?.name?.split(' ')[0]

  return (
    <PageShell>
      <PageHero
        Icon={LayoutDashboard}
        eyebrow={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        title="Overview"
        actions={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="sr-only">Period</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
        }
      >
        <p aria-live="polite">{state.status === 'ready' ? headline(data) : 'Defects across every lift company'}</p>
      </PageHero>

      {state.savedAt && <OfflineBanner savedAt={state.savedAt} what="counts" onRetry={load} retrying={state.retrying} />}

      {state.status === 'offline' ? (
        <OfflineState onRetry={load} retrying={state.retrying} />
      ) : state.status === 'error' ? (
        <ErrorState title="Couldn’t load the overview" message="Something went wrong on our side. Try again in a moment." onRetry={load} />
      ) : (
        <>
          <section aria-label="Counts" aria-busy={state.status === 'loading'} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {state.status === 'loading' ? (
              <><TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton /></>
            ) : (
              <>
                <Tile to="/defects?overdue=true" label="Overdue" value={data.overdue} Icon={AlertTriangle} tone="danger" hint="Chase up" />
                <Tile to="/defects?status=pending_verification" label="To verify" value={data.pendingVerification} Icon={ClipboardCheck} tone="amber" hint="Review repairs" />
                <Tile to="/defects?status=active" label="Open defects" value={data.open} Icon={Wrench} hint="View all" />
                <Tile to="/inspections" label="Inspections" value={data.inspections} Icon={History} hint="History" />
              </>
            )}
          </section>

          <section aria-labelledby="contractors" className={cn(CARD, 'p-2')}>
            <div className="flex items-end gap-3 border-b border-border/70 px-3 pb-2.5 pt-2">
              <div className="min-w-0 flex-1">
                <h2 id="contractors" className="text-base font-semibold text-foreground">Needs attention</h2>
                <p className="text-xs text-muted-foreground">Most overdue first</p>
              </div>
              <span className="w-[2.75rem] text-center text-xs font-medium text-muted-foreground">Open</span>
              <span className="w-[2.75rem] text-center text-xs font-medium text-muted-foreground">Overdue</span>
              <span className="w-4" aria-hidden="true" />
            </div>

            {state.status === 'loading' ? (
              <ul aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-3">
                    <span className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
                    <span className="flex-1 space-y-1.5">
                      <span className="block h-4 w-40 animate-pulse rounded bg-muted" />
                      <span className="block h-3 w-24 animate-pulse rounded bg-muted" />
                    </span>
                    <span className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                  </li>
                ))}
              </ul>
            ) : nothingOpen ? (
              <EmptyState
                Icon={ShieldCheck}
                title="All clear"
                message="No open defects for this period. New ones appear here as soon as an inspection fails an item."
                className="m-2 border-0"
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {contractors.map((c) => <ContractorRow key={c.contractorId} c={c} max={maxOpen} />)}
              </ul>
            )}
          </section>
        </>
      )}
      {/* Prototype-only demo controls, kept out of the way at the bottom */}
      <DemoScenarioBar className="bg-card/70 backdrop-blur" />
    </PageShell>
  )
}
