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
  major:    { label: 'Major',    className: 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/30', strip: 'bg-accent' },
  minor:    { label: 'Minor',    className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border', strip: 'bg-muted-foreground/30' },
}

// "Apex Lifts" -> "AL", for contractor avatars
export function initials(name) {
  return String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

const toDate = (iso) => new Date(`${iso}T00:00:00`)
// 'YYYY-MM-DD' in local time (toISOString would give the UTC date - yesterday before 8am in Singapore)
export const localIso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = () => localIso()

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

// ─── Rectification history (F02.10) ───────────────────────────────────────────

const ROLE_LABELS = { inspector: 'Inspector', contractor: 'Contractor', admin: 'EMS admin' }

// "Ivy Tan (Inspector)"; "System" when no person did it
export function actorText(actor) {
  if (!actor) return 'System'
  const role = ROLE_LABELS[actor.role]
  return role ? `${actor.name} (${role})` : actor.name
}

const STATUS_EVENT_TITLES = {
  open: 'Reopened',
  acknowledged: 'Acknowledged by contractor',
  in_progress: 'Work started',
  pending_verification: 'Signed off - waiting for verification',
  closed: 'Repair approved - defect closed',
}

// One history row's title and colour. tone: neutral | info | danger | success
export function eventTitle(event) {
  if (event.action === 'created') return { title: 'Defect raised', tone: 'neutral' }
  if (event.action === 'reassigned') return { title: 'Reassigned to another contractor', tone: 'info' }
  if (event.action === 'status_change') {
    if (event.fromStatus === 'pending_verification' && event.toStatus === 'in_progress') {
      return { title: 'Repair rejected - returned for more work', tone: 'danger' }
    }
    const title = STATUS_EVENT_TITLES[event.toStatus] ?? `Moved to ${event.toStatus}`
    return { title, tone: event.toStatus === 'closed' ? 'success' : 'neutral' }
  }
  if (event.action === 'update_posted') return { title: 'Progress update', tone: 'neutral' }
  // Any other action someone logs later, e.g. 'photo_added' -> 'Photo added'
  const words = String(event.action ?? '').replace(/_/g, ' ').trim()
  return { title: words ? words[0].toUpperCase() + words.slice(1) : 'Change recorded', tone: 'neutral' }
}

// "12 Nov 2026, 9:14 am"
export function formatEventTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Time from one history entry to the next: "3 hours", "2 days"; '' when under a minute
export function timeBetween(fromIso, toIso) {
  const ms = new Date(toIso) - new Date(fromIso)
  if (!(ms >= 60000)) return ''
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

// One line for the collapsed History header:
// "7 entries · raised 12 Nov · open 6 days · 1 rejected repair", or "... · closed after 9 days"
export function historySummary(events, now = new Date()) {
  if (!events?.length) return ''
  const parts = [`${events.length} entr${events.length === 1 ? 'y' : 'ies'}`]
  const raised = events.find((e) => e.action === 'created') ?? events[0]
  parts.push(`raised ${new Date(raised.createdAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}`)
  const closed = [...events].reverse().find((e) => e.toStatus === 'closed')
  const span = timeBetween(raised.createdAt, closed ? closed.createdAt : now.toISOString())
  if (closed) parts.push(span ? `closed after ${span}` : 'closed')
  else if (span) parts.push(`open ${span}`)
  const rejected = events.filter((e) => e.fromStatus === 'pending_verification' && e.toStatus === 'in_progress').length
  if (rejected) parts.push(`${rejected} rejected repair${rejected === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

// F02.8 search: every word must appear in the defect number, lift, item or contractor
// (case-insensitive), so "apex door" finds Apex Lifts door defects.
export function matchesSearch(defect, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = [
    defect.code, defect.liftCode, defect.liftName, defect.item, defect.contractorName,
    defect.checklistItem?.code, defect.checklistItem?.text, defect.inspectionCode,
  ].filter(Boolean).join(' ').toLowerCase()
  return words.every((w) => haystack.includes(w))
}
