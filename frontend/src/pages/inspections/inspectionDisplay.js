// Owner: Kandha - display and data helpers for the inspection pages (F01.3-F01.12, F05.3).
// Pure functions where possible so they are easy to test.
import { cn } from '@/lib/utils'

// ─── Shared styles (44px tall: touch-sized for use on site) ───────────────────
const ACTION =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
export const ACTION_PRIMARY = cn(ACTION, 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90')
export const ACTION_OUTLINE = cn(ACTION, 'border border-border bg-card text-foreground shadow-sm hover:bg-muted')
export const FIELD =
  'h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export const SEVERITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
]

export const SEVERITY_TONES = {
  critical: 'bg-destructive/10 text-destructive ring-destructive/30',
  major: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-400',
  minor: 'bg-muted text-foreground/80 ring-border',
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// ─── Dates ────────────────────────────────────────────────────────────────────
// 'YYYY-MM-DD' or an ISO timestamp -> '12 Nov 2026'
export function formatDay(value) {
  if (!value) return '-'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDayTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const time = d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${formatDay(value)}, ${time}`
}

export function formatClock(date = new Date()) {
  return date.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// "Contractor due: 24 Nov 2026" - the same rule as defectService.dueDateFor, using the
// day counts the API sends (meta.severityDueDays) so the numbers are never copied here.
export function dueDatePreview(severity, severityDueDays, from = new Date()) {
  const days = severityDueDays?.[severity]
  if (days === undefined || days === null) return null
  const due = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)
  return `Contractor due: ${due.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ─── Checklist state ──────────────────────────────────────────────────────────
// The checklist page keeps answers as { [checklistItemId]: { result, description, location, severity, photos } }.
export function answersFromDetail(detail) {
  const answers = {}
  for (const r of detail?.results ?? []) {
    answers[r.checklistItemId] = {
      result: r.result ?? null,
      description: r.description ?? '',
      location: r.location ?? '',
      severity: r.severity ?? null,
      photos: r.photos ?? [],
    }
  }
  return answers
}

// Items grouped by section, in checklist order: [{ section, items: [result, ...] }]
export function groupBySection(results) {
  const groups = []
  for (const item of [...(results ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
    let group = groups.find((g) => g.section === item.section)
    if (!group) {
      group = { section: item.section, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}

export const sectionSlug = (section) => `section-${String(section).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

export function countAnswered(items, answers) {
  return items.filter((i) => answers[i.checklistItemId]?.result).length
}

// The same rules as the server (inspectionService.submit), so the page can name problems
// without a round trip. The server stays the authority: it re-checks on submit.
export function findProblems(items, answers) {
  const unanswered = []
  const incompleteDefects = []
  for (const item of items) {
    const a = answers[item.checklistItemId]
    if (!a?.result) unanswered.push(item.checklistItemId)
    else if (a.result === 'defect' && (!String(a.description ?? '').trim() || !a.severity)) incompleteDefects.push(item.checklistItemId)
  }
  return { unanswered, incompleteDefects }
}

// "3 items not answered · 1 defect missing severity"
export function problemSummary({ unanswered = [], incompleteDefects = [] }) {
  const parts = []
  if (unanswered.length) parts.push(`${plural(unanswered.length, 'item')} not answered`)
  if (incompleteDefects.length) parts.push(`${plural(incompleteDefects.length, 'defect')} missing a description or severity`)
  return parts.join(' · ')
}

// "All pass" for one section: sets every unanswered item to Pass and leaves Defects alone.
export function applyAllPass(answers, items) {
  const next = { ...answers }
  const changedIds = []
  for (const item of items) {
    const current = answers[item.checklistItemId]
    if (current?.result) continue
    next[item.checklistItemId] = { ...blankAnswer(), ...current, result: 'pass' }
    changedIds.push(item.checklistItemId)
  }
  return { answers: next, changedIds }
}

export const blankAnswer = () => ({ result: null, description: '', location: '', severity: null, photos: [] })

// What PUT /api/inspections/:id/results expects for one item
export function toPayload(itemId, answer) {
  const a = answer ?? blankAnswer()
  return {
    checklistItemId: itemId,
    result: a.result ?? null,
    description: a.result === 'defect' ? a.description || null : null,
    location: a.result === 'defect' ? a.location || null : null,
    severity: a.result === 'defect' ? a.severity ?? null : null,
  }
}

// ─── Errors and downloads ─────────────────────────────────────────────────────
export function errorMessage(err, fallback = 'Something went wrong. Try again.') {
  return err?.response?.data?.message || fallback
}

// Axios turns a blocked network into an error with no response
export const isOffline = (err) => !err?.response

// Downloads the CSV through the shared Axios instance (a plain link would not carry the login token).
export async function downloadInspectionsCsv(api, params = {}) {
  const res = await api.get('/inspections/export', { params, responseType: 'blob' })
  const blob = res.data instanceof Blob ? res.data : new Blob([res.data ?? ''], { type: 'text/csv' })
  const disposition = res.headers?.['content-disposition'] ?? ''
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? 'inspections.csv'
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return name
}

// Query params for the list and export endpoints, from the page's filter state. Blank values are left out.
export function filterParams({ liftId, from, to, result } = {}) {
  const params = {}
  if (liftId) params.liftId = liftId
  if (from) params.from = from
  if (to) params.to = to
  if (result) params.result = result
  return params
}
