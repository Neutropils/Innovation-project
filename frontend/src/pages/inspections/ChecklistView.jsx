import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, CheckCheck, ClipboardCheck, MapPin, Save } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import PageHero, { CARD, PageShell } from '@/components/PageHero'
import PhotoUpload from '@/components/PhotoUpload'
import { mapsUrl } from '@/pages/lifts/liftDisplay'
import {
  ACTION_OUTLINE, ACTION_PRIMARY, FIELD, SEVERITIES, answersFromDetail, applyAllPass, blankAnswer, countAnswered,
  dueDatePreview, errorMessage, findProblems, formatClock, formatDayTime, groupBySection, plural, problemSummary,
  sectionSlug, toPayload,
} from './inspectionDisplay'

// Owner: Kandha
// Features: F01.3 checklist by section, F01.4 Pass/Defect, F01.5 All pass, F01.6 defect capture,
//           F01.7 photos, F01.8 filled from records, F01.9 drafts (autosave), F01.10 validate and submit
// Wireframe: design/screens.md "Inspection checklist"
//
// Answers are saved to the server about a second after each change (PUT .../results), so a
// reload or a second device never loses work. Submit saves first, then POSTs .../submit.

const AUTOSAVE_MS = 1000

// ─── One checklist item ───────────────────────────────────────────────────────
const ItemRow = memo(function ItemRow({ item, answer, flagged, severityDueDays, onChange }) {
  const id = item.checklistItemId
  const a = answer ?? blankAnswer()
  const isDefect = a.result === 'defect'
  const missingResult = flagged === 'unanswered'
  const missingDefect = flagged === 'incomplete'
  const due = isDefect && a.severity ? dueDatePreview(a.severity, severityDueDays) : null

  return (
    <li id={`item-${id}`} className={cn('scroll-mt-24 p-4', flagged && 'rounded-xl ring-2 ring-inset ring-destructive/70')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium text-muted-foreground">{item.code}</p>
          <p className="text-[15px] font-medium text-foreground">{item.itemText}</p>
        </div>
        <div role="group" aria-label={`Result for ${item.code}`} className="grid flex-shrink-0 grid-cols-2 gap-2 sm:w-56">
          <button
            type="button"
            aria-pressed={a.result === 'pass'}
            onClick={() => onChange(id, { result: 'pass' })}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              a.result === 'pass' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Pass
          </button>
          <button
            type="button"
            aria-pressed={isDefect}
            onClick={() => onChange(id, { result: 'defect', location: a.location || item.section })}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isDefect ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Defect
          </button>
        </div>
      </div>

      {missingResult && <p className="mt-2 text-sm font-medium text-destructive">Choose Pass or Defect for this item.</p>}

      {isDefect && (
        <div className="mt-3 space-y-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
          <div>
            <label htmlFor={`desc-${id}`} className="mb-1 block text-sm font-medium text-foreground">
              What’s wrong? <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <textarea
              id={`desc-${id}`}
              value={a.description}
              onChange={(e) => onChange(id, { description: e.target.value })}
              rows={3}
              maxLength={2000}
              required
              aria-invalid={missingDefect && !a.description.trim()}
              placeholder="Describe the fault"
              className={cn(FIELD, 'h-auto min-h-[88px] py-2.5', missingDefect && !a.description.trim() && 'border-destructive')}
            />
          </div>

          <div>
            <label htmlFor={`loc-${id}`} className="mb-1 block text-sm font-medium text-foreground">Location</label>
            <input
              id={`loc-${id}`}
              value={a.location}
              onChange={(e) => onChange(id, { location: e.target.value })}
              maxLength={150}
              placeholder={item.section}
              className={FIELD}
            />
          </div>

          <div role="radiogroup" aria-label={`Severity for ${item.code}`} aria-required="true">
            <p className="mb-1 text-sm font-medium text-foreground">
              Severity <span className="text-destructive" aria-hidden="true">*</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={a.severity === s.value}
                  onClick={() => onChange(id, { severity: s.value })}
                  className={cn(
                    'h-11 rounded-xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    a.severity === s.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted',
                    missingDefect && !a.severity && a.severity !== s.value && 'border-destructive',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {due && <p className="mt-1.5 text-sm text-muted-foreground">{due}</p>}
          </div>

          {/* F01.7: Jerald's PhotoUpload. It is a stub until his upload service lands; photos already
              attached to this answer (read from the API) are listed below it. */}
          <div className="flex flex-wrap items-center gap-3">
            <PhotoUpload label="Add photo" onUploaded={(photo) => onChange(id, { photos: [...a.photos, photo] })} />
            {a.photos.map((p) => (
              <a key={p.id ?? p.url} href={p.url} target="_blank" rel="noreferrer" className="block h-11 w-11 overflow-hidden rounded-lg border border-border">
                <img src={p.url} alt="Defect photo" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>

          {missingDefect && (!a.description.trim() || !a.severity) && (
            <p className="text-sm font-medium text-destructive">
              {!a.description.trim() && !a.severity ? 'Add a description and choose a severity.' : !a.description.trim() ? 'Add a description.' : 'Choose a severity.'}
            </p>
          )}
        </div>
      )}
    </li>
  )
})

// ─── Save status text ─────────────────────────────────────────────────────────
function SaveStatus({ save, onRetry, className }) {
  let text = null
  if (save.status === 'saving') text = 'Saving…'
  else if (save.status === 'saved') text = `Saved ${formatClock(save.at)}`
  else if (save.status === 'dirty') text = 'Unsaved changes'
  if (save.status === 'error') {
    return (
      <p role="status" className={cn('text-sm font-medium text-destructive', className)}>
        Not saved - <button type="button" onClick={onRetry} className="underline underline-offset-2">retry</button>
      </p>
    )
  }
  return <p role="status" aria-live="polite" className={cn('text-sm text-muted-foreground', className)}>{text}</p>
}

function Actions({ save, onSave, onSubmit, onRetry, submitting }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SaveStatus save={save} onRetry={onRetry} className="w-full" />
      <button type="button" onClick={onSave} disabled={submitting || save.status === 'saving'} className={cn(ACTION_OUTLINE, 'flex-1')}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Save draft
      </button>
      <button type="button" onClick={onSubmit} disabled={submitting} className={cn(ACTION_PRIMARY, 'flex-1')}>
        <CheckCheck className="h-4 w-4" aria-hidden="true" />
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  )
}

// ─── The page ─────────────────────────────────────────────────────────────────
export default function ChecklistView({ detail, severityDueDays, onSubmitted }) {
  const [answers, setAnswers] = useState(() => answersFromDetail(detail))
  const [save, setSave] = useState({ status: 'idle', at: null })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [checked, setChecked] = useState(false) // true after a failed submit: outline what is missing
  const [serverProblems, setServerProblems] = useState(null) // items the server named in a 422 that this page did not catch

  const answersRef = useRef(answers)
  const dirty = useRef(new Set())
  const timer = useRef(null)
  const inFlight = useRef(Promise.resolve(true))

  const items = detail.results
  const sections = useMemo(() => groupBySection(items), [items])
  const answered = countAnswered(items, answers)
  const live = useMemo(() => findProblems(items, answers), [items, answers])
  // What to outline after a failed submit: whatever is still missing here, plus anything the
  // server named that the person has not touched since
  const problems = useMemo(() => {
    if (!checked) return { unanswered: [], incompleteDefects: [] }
    const merge = (a, b) => [...new Set([...a, ...(b ?? [])])]
    return {
      unanswered: merge(live.unanswered, serverProblems?.unanswered),
      incompleteDefects: merge(live.incompleteDefects, serverProblems?.incompleteDefects),
    }
  }, [checked, live, serverProblems])

  // Saves every changed item. Saves run one at a time; a failed one puts its items back in the queue.
  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    await inFlight.current
    const ids = [...dirty.current]
    if (ids.length === 0) {
      setSave((s) => (s.status === 'error' ? s : { status: 'saved', at: s.at ?? new Date() }))
      return true
    }
    dirty.current.clear()
    setSave((s) => ({ ...s, status: 'saving' }))
    const run = (async () => {
      try {
        await api.put(`/inspections/${detail.id}/results`, { results: ids.map((id) => toPayload(id, answersRef.current[id])) })
        setSave({ status: dirty.current.size ? 'dirty' : 'saved', at: new Date() })
        return true
      } catch (err) {
        ids.forEach((id) => dirty.current.add(id))
        setSave({ status: 'error', at: null, message: errorMessage(err) })
        return false
      }
    })()
    inFlight.current = run
    return run
  }, [detail.id])

  function markDirty(ids) {
    ids.forEach((id) => dirty.current.add(id))
    setSave((s) => ({ ...s, status: 'dirty' }))
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, AUTOSAVE_MS)
  }

  const change = useCallback((itemId, patch) => {
    const next = { ...answersRef.current, [itemId]: { ...blankAnswer(), ...answersRef.current[itemId], ...patch } }
    answersRef.current = next
    setAnswers(next)
    setServerProblems((p) => p && {
      unanswered: p.unanswered.filter((x) => x !== itemId),
      incompleteDefects: p.incompleteDefects.filter((x) => x !== itemId),
    })
    dirty.current.add(itemId)
    setSave((s) => ({ ...s, status: 'dirty' }))
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, AUTOSAVE_MS)
  }, [flush])

  function allPass(sectionItems) {
    const { answers: next, changedIds } = applyAllPass(answersRef.current, sectionItems)
    if (changedIds.length === 0) return
    answersRef.current = next
    setAnswers(next)
    markDirty(changedIds)
  }

  // Warn before a browser refresh or tab close while something is unsaved. Leaving through the
  // app's own links saves first (cleanup below), so nothing is lost either way.
  useEffect(() => {
    function warn(e) {
      if (dirty.current.size > 0 || save.status === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [save.status])

  useEffect(() => () => {
    if (dirty.current.size > 0) flush()
  }, [flush])

  function showProblems(problems) {
    setChecked(true)
    const bad = new Set([...problems.unanswered, ...problems.incompleteDefects])
    const first = items.find((i) => bad.has(i.checklistItemId))
    if (first) {
      const el = document.getElementById(`item-${first.checklistItemId}`)
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    }
  }

  async function submit() {
    setSubmitError('')
    setSubmitting(true)
    try {
      const saved = await flush()
      if (!saved) return
      const local = findProblems(items, answersRef.current)
      if (local.unanswered.length || local.incompleteDefects.length) return showProblems(local)
      const res = await api.post(`/inspections/${detail.id}/submit`)
      dirty.current.clear()
      onSubmitted(res.data.data)
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 422 && (data?.unanswered || data?.incompleteDefects)) {
        const named = { unanswered: data.unanswered ?? [], incompleteDefects: data.incompleteDefects ?? [] }
        setServerProblems(named)
        showProblems(named)
      } else {
        setSubmitError(errorMessage(err, 'Couldn’t submit the inspection. Check your connection and try again.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const flagOf = (id) => {
    if (problems.unanswered.includes(id)) return 'unanswered'
    if (problems.incompleteDefects.includes(id)) return 'incomplete'
    return null
  }
  const liveSummary = checked ? problemSummary(problems) : ''
  const lift = detail.lift
  const percent = items.length ? Math.round((answered / items.length) * 100) : 0

  return (
    <PageShell>
      <Link
        to="/inspections"
        onClick={() => { if (dirty.current.size > 0) flush() }}
        className="inline-flex h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Inspections
      </Link>

      <PageHero Icon={ClipboardCheck} eyebrow="Spot-check" title={lift.liftCode}>
        <p>{lift.address}</p>
      </PageHero>

      {(liveSummary || submitError) && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{liveSummary || submitError}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        {/* Summary: stays in view on desktop */}
        <aside aria-label="Inspection summary" className="space-y-4 lg:sticky lg:top-4">
          <div className={cn(CARD, 'space-y-4 p-4')}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filled from records</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-muted-foreground">Lift</dt><dd className="min-w-0 font-medium text-foreground">{lift.liftCode}</dd></div>
                <div className="flex gap-2">
                  <dt className="w-20 flex-shrink-0 text-muted-foreground">Address</dt>
                  <dd className="min-w-0 text-foreground">
                    {lift.address}
                    <a href={mapsUrl(lift)} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-[44px] items-center gap-1 font-medium text-primary underline-offset-2 hover:underline dark:text-accent">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      Find in map
                    </a>
                  </dd>
                </div>
                <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-muted-foreground">Contractor</dt><dd className="min-w-0 text-foreground">{detail.contractor?.name ?? '-'}</dd></div>
                <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-muted-foreground">Inspector</dt><dd className="min-w-0 text-foreground">{detail.inspector?.name ?? '-'}</dd></div>
                <div className="flex gap-2"><dt className="w-20 flex-shrink-0 text-muted-foreground">Started</dt><dd className="min-w-0 text-foreground">{formatDayTime(detail.createdAt)}</dd></div>
              </dl>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-foreground">Answered</span>
                <span className="text-muted-foreground">{answered}/{items.length}</span>
              </div>
              <div
                role="progressbar"
                aria-label="Items answered"
                aria-valuemin={0}
                aria-valuemax={items.length}
                aria-valuenow={answered}
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>

            <nav aria-label="Jump to section">
              <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {sections.map((s) => (
                  <li key={s.section}>
                    <a
                      href={`#${sectionSlug(s.section)}`}
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById(sectionSlug(s.section))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
                      }}
                      className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:border-transparent"
                    >
                      <span>{s.section}</span>
                      <span className="text-muted-foreground">{countAnswered(s.items, answers)}/{s.items.length}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="hidden lg:block">
              <Actions save={save} onSave={flush} onSubmit={submit} onRetry={flush} submitting={submitting} />
            </div>
          </div>
        </aside>

        {/* Sections */}
        <div className="min-w-0 space-y-5">
          {sections.map((s) => {
            const done = countAnswered(s.items, answers)
            return (
              <section key={s.section} id={sectionSlug(s.section)} aria-labelledby={`${sectionSlug(s.section)}-title`} className={cn(CARD, 'scroll-mt-4 overflow-hidden')}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                  <div>
                    <h2 id={`${sectionSlug(s.section)}-title`} className="text-base font-semibold text-foreground">{s.section}</h2>
                    <p className="text-xs text-muted-foreground">{done}/{plural(s.items.length, 'item')} answered</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => allPass(s.items)}
                    disabled={done === s.items.length}
                    aria-label={`Mark all unanswered items in ${s.section} as pass`}
                    className={cn(ACTION_OUTLINE, 'h-11')}
                  >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    All pass
                  </button>
                </div>
                <ul className="divide-y divide-border">
                  {s.items.map((item) => (
                    <ItemRow
                      key={item.checklistItemId}
                      item={item}
                      answer={answers[item.checklistItemId]}
                      flagged={flagOf(item.checklistItemId)}
                      severityDueDays={severityDueDays}
                      onChange={change}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>

      {/* Phone: Save and Submit stay at the bottom, above the tab bar */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 border-t border-border bg-card/95 p-3 backdrop-blur md:-mx-6 md:-mb-6 md:px-6 lg:hidden">
        <Actions save={save} onSave={flush} onSubmit={submit} onRetry={flush} submitting={submitting} />
      </div>
    </PageShell>
  )
}
