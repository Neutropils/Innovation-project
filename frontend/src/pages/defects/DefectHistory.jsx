import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, History } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib'
import { useAuth } from '@/context/AuthContext'
import { CARD } from '@/components/PageHero'
import { ErrorState } from '@/components/StateViews'
import { OfflineBanner, OfflineState, useOfflineLoad } from '@/components/OfflineMode'
import StatusBadge from '@/components/StatusBadge'
import { SEVERITY_META, actorText, eventTitle, formatEventTime, historySummary, timeBetween } from './defectDisplay'

// Owner: Si Qi
// Feature: F02.10 rectification history - every change to one defect, oldest first.
// Reads GET /api/defects/:id/history (the defect_events table).
// The section starts collapsed with a one-line summary; open it to see the timeline. Each entry
// shows what happened, who and when; tap it to see the note and details (inspection, checklist
// item, severity, due date, photos, reasons).
// Usage: <DefectHistory defectId={id} refreshKey={n} /> - bump refreshKey after a change
// (e.g. a reassignment) so the new entry appears.

const DOT = {
  neutral: 'bg-primary/60 ring-primary/20 dark:bg-accent/70',
  info: 'bg-violet-500 ring-violet-500/20',
  danger: 'bg-destructive ring-destructive/20',
  success: 'bg-emerald-500 ring-emerald-500/20',
}

// The labelled facts an entry carries, in reading order
function detailRows(details, canOpenInspection) {
  if (!details) return []
  const rows = []
  if (details.inspectionCode) {
    rows.push(['Found in', canOpenInspection && details.inspectionId
      ? <Link to={`/inspections?report=${details.inspectionId}`} className="font-mono text-primary underline-offset-2 hover:underline dark:text-accent">{details.inspectionCode}</Link>
      : <span className="font-mono">{details.inspectionCode}</span>])
  }
  if (details.checklistCode) rows.push(['Checklist item', <><span className="font-mono">{details.checklistCode}</span> {details.checklistText}</>])
  if (details.severity) rows.push(['Severity', SEVERITY_META[details.severity]?.label ?? details.severity])
  if (details.dueDate) rows.push(['Due', formatDate(details.dueDate)])
  if (details.contractorName) rows.push(['Assigned to', details.contractorName])
  if (details.fromContractor) rows.push(['From', details.fromContractor])
  if (details.toContractor) rows.push(['To', details.toContractor])
  const photoCount = Array.isArray(details.photos) ? details.photos.length : details.photos
  if (photoCount) rows.push(['Evidence', `${photoCount} photo${photoCount === 1 ? '' : 's'} attached`])
  if (details.confirmed) rows.push(['Sign-off', 'Confirmed the work is done'])
  return rows
}

function HistoryEntry({ event, previous, last, canOpenInspection }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { title, tone } = eventTitle(event)
  const rows = detailRows(event.details, canOpenInspection)
  const hasMore = Boolean(event.note) || rows.length > 0
  const gap = previous ? timeBetween(previous.createdAt, event.createdAt) : ''
  const isRejection = tone === 'danger'

  const heading = (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={cn('text-sm font-semibold', isRejection ? 'text-destructive' : 'text-foreground')}>{title}</span>
        {event.fromStatus && event.toStatus && (
          <span className="inline-flex items-center gap-1">
            <StatusBadge status={event.fromStatus} />
            <ArrowRight className="h-3 w-3 text-muted-foreground" aria-label="to" />
            <StatusBadge status={event.toStatus} />
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {actorText(event.actor)}
        <span aria-hidden="true"> · </span>
        <time dateTime={event.createdAt}>{formatEventTime(event.createdAt)}</time>
        {gap && <span className="text-muted-foreground/80"> ({gap} later)</span>}
      </span>
    </>
  )

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {/* Line joining this dot to the next one */}
      {!last && <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden="true" />}
      <span className={cn('relative mt-3 h-[11px] w-[11px] flex-shrink-0 rounded-full ring-4', DOT[tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {hasMore ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0 flex-1">{heading}</span>
            <ChevronDown className={cn('mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </button>
        ) : (
          <div className="py-1.5">{heading}</div>
        )}

        {hasMore && open && (
          <div id={panelId} className="mt-1 space-y-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm motion-safe:animate-in motion-safe:fade-in">
            {event.note && (
              <p className={cn('whitespace-pre-line break-words', isRejection ? 'text-destructive' : 'text-foreground/90')}>
                {isRejection && <span className="font-semibold">Reason: </span>}
                {event.note}
              </p>
            )}
            {Array.isArray(event.details?.photos) && event.details.photos.length > 0 && (
              <ul aria-label="Photos" className="flex flex-wrap gap-2">
                {event.details.photos.map((photo, i) => (
                  <li key={photo.id ?? i}>
                    <a href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg ring-1 ring-border transition hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <img src={photo.url} alt={`Repair photo ${i + 1}`} loading="lazy" className="h-20 w-[6.5rem] object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {rows.length > 0 && (
              <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-[auto_1fr]">
                {rows.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mb-1 font-medium text-foreground sm:mb-0">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export default function DefectHistory({ defectId, refreshKey = 0, className }) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const fetchHistory = useCallback(
    () => api.get(`/defects/${defectId}/history`).then((res) => res.data.data ?? []),
    [defectId]
  )
  const [state, load] = useOfflineLoad(`defect-history:${defectId}`, fetchHistory)

  useEffect(() => { load() }, [load, refreshKey])

  const events = state.data ?? []
  const summary = state.status === 'ready' ? historySummary(events) : ''
  const canOpenInspection = user?.role !== 'contractor'

  return (
    <section aria-labelledby="defect-history" className={cn(CARD, 'p-2', className)}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="defect-history-timeline"
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:text-accent">
          <History className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="defect-history" className="block text-base font-semibold text-foreground">History</span>
          <span className="block text-xs text-muted-foreground">
            {state.status === 'loading'
              ? 'Loading…'
              : state.status === 'error' ? 'Couldn’t load the history - open to try again'
              : summary || 'Every change to this defect'}
          </span>
        </span>
        <span className="text-xs font-medium text-muted-foreground">{expanded ? 'Hide' : 'Show'}</span>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
      </button>

      {expanded && (
        <div id="defect-history-timeline" className="border-t border-border/70 px-2 pb-2 pt-4">
          {state.savedAt && <OfflineBanner savedAt={state.savedAt} what="history" onRetry={load} retrying={state.retrying} />}

          {state.status === 'loading' && (
            <ul aria-hidden="true" className="space-y-4">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1 h-3 w-3 animate-pulse rounded-full bg-muted" />
                  <span className="flex-1 space-y-1.5">
                    <span className="block h-4 w-48 animate-pulse rounded bg-muted" />
                    <span className="block h-3 w-32 animate-pulse rounded bg-muted" />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {state.status === 'offline' && <OfflineState onRetry={load} retrying={state.retrying} className="border-0" />}

          {state.status === 'error' && (
            <ErrorState title="Couldn’t load the history" message="Something went wrong on our side. Try again in a moment." onRetry={load} className="border-0" />
          )}

          {state.status === 'ready' && events.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing recorded for this defect yet.</p>
          )}

          {state.status === 'ready' && events.length > 0 && (
            <>
              <p className="mb-3 text-xs text-muted-foreground">Oldest first. Tap an entry to see its notes and details.</p>
              <ol aria-label="Defect history" className={cn(state.savedAt && 'mt-3')}>
                {events.map((e, i) => (
                  <HistoryEntry key={e.id} event={e} previous={events[i - 1]} last={i === events.length - 1} canOpenInspection={canOpenInspection} />
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  )
}
