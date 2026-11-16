// Owner: Si Qi - shared display helpers for defects (labels, severity, due-date text).

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Not closed' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'pending_verification', label: 'Pending verification' },
  { value: 'closed', label: 'Closed' },
]

export const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
]

// className = severity pill, strip = coloured bar on the left of a defect row
export const SEVERITY_META = {
  critical: { label: 'Critical', className: 'bg-destructive text-destructive-foreground', strip: 'bg-destructive' },
  major:    { label: 'Major',    className: 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/30', strip: 'bg-orange-500' },
  minor:    { label: 'Minor',    className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border', strip: 'bg-muted-foreground/30' },
}

// "Apex Lifts" -> "AL", for contractor avatars
export function initials(name) {
  return String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

const toDate = (iso) => new Date(`${iso}T00:00:00`)
const todayIso = () => new Date().toISOString().slice(0, 10)

export function formatShortDate(iso) {
  return toDate(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

// "Due 19 Nov (in 2 days)", "Due today", "Overdue 2 days"; empty for closed defects
export function dueText(defect, today = todayIso()) {
  if (defect.status === 'closed') return { text: '', tone: 'muted' }   // the status badge already says Closed
  const days = Math.round((toDate(defect.dueDate) - toDate(today)) / 86400000)
  if (days < 0) return { text: `Overdue ${-days} day${days === -1 ? '' : 's'}`, tone: 'overdue' }
  if (days === 0) return { text: 'Due today', tone: 'soon' }
  if (days <= 2) return { text: `Due ${formatShortDate(defect.dueDate)} (in ${days} day${days === 1 ? '' : 's'})`, tone: 'soon' }
  return { text: `Due ${formatShortDate(defect.dueDate)}`, tone: 'normal' }
}

// F02.8 search: every word must appear in the defect number, lift, item or contractor
// (case-insensitive), so "apex door" finds Apex Lifts door defects.
export function matchesSearch(defect, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = [defect.code, defect.liftCode, defect.liftName, defect.item, defect.contractorName].join(' ').toLowerCase()
  return words.every((w) => haystack.includes(w))
}

// ── Time range filters (F02.8) ─────────────────────────────────────────────────────
// reported: when the defect was raised; due: upcoming due date (open defects only).
export const REPORTED_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range…' },
]

export const DUE_OPTIONS = [
  { value: 'today', label: 'Due today' },
  { value: '3d', label: 'Due in 3 days' },
  { value: '7d', label: 'Due in 7 days' },
  { value: '14d', label: 'Due in 14 days' },
]

// Date-only arithmetic on 'YYYY-MM-DD' strings (UTC, so no time-zone drift)
export function shiftIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function matchesDates(defect, params = {}, today = new Date().toISOString().slice(0, 10)) {
  const { reported, from, to, due } = params
  const created = defect.createdAt
  if (reported === '7d' && created < shiftIso(today, -7)) return false
  if (reported === '30d' && created < shiftIso(today, -30)) return false
  if (reported === 'month' && created < `${today.slice(0, 8)}01`) return false
  if (reported === 'custom' && ((from && created < from) || (to && created > to))) return false
  if (due) {
    if (defect.status === 'closed') return false
    const days = due === 'today' ? 0 : parseInt(due, 10)
    if (defect.dueDate < today || defect.dueDate > shiftIso(today, days)) return false
  }
  return true
}

export function formatRange(from, to) {
  if (from && to) return `${formatShortDate(from)} - ${formatShortDate(to)}`
  if (from) return `From ${formatShortDate(from)}`
  if (to) return `Until ${formatShortDate(to)}`
  return 'Custom range'
}
