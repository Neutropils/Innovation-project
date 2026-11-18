// Owner: Jerald
// Date helpers and shared class names for the contractor pages (Figma Make design).

// 'YYYY-MM-DD' -> local Date at midnight
export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Whole days from today to a 'YYYY-MM-DD' date, in local time. Negative = in the past.
export function daysUntil(dueDate, today = new Date()) {
  const [y, m, d] = dueDate.split('-').map(Number)
  const due = Date.UTC(y, m - 1, d)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due - now) / 86_400_000)
}

export function isDefectOverdue(defect, today = new Date()) {
  return defect.status !== 'closed' && daysUntil(defect.dueDate, today) < 0
}

// Date -> '5:00 PM'
export function formatTime(date) {
  const h = date.getHours()
  return `${h % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// Date -> '16 Nov 2026' (or '16 Nov' without the year)
export function formatDay(date, withYear = true) {
  return date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }) })
}

// '2026-11-16' + '17:00' -> '16 Nov 2026, 5:00 PM'
export function formatDue(dueDate, dueTime) {
  const date = parseDate(dueDate)
  if (!dueTime) return formatDay(date)
  const [h, m] = dueTime.split(':').map(Number)
  date.setHours(h, m)
  return `${formatDay(date)}, ${formatTime(date)}`
}

export function dueLabel(defect, today = new Date()) {
  if (defect.status === 'closed') {
    return `Completed on ${formatDay(parseDate(defect.completedDate ?? defect.dueDate), false)}`
  }
  const days = daysUntil(defect.dueDate, today)
  if (days < 0) return `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

// History timestamp: 'Just now', 'Today, 2:24 PM' or '12 Nov, 9:42 AM'
export function formatWhen(iso, now = new Date()) {
  const date = new Date(iso)
  if (now - date < 60_000) return 'Just now'
  if (date.toDateString() === now.toDateString()) return `Today, ${formatTime(date)}`
  return `${formatDay(date, false)}, ${formatTime(date)}`
}

// Shared looks from the Figma design
export const CARD = 'rounded-[18px] border border-[#e2e7ea] bg-white p-4 text-[#172330] shadow-[0_4px_16px_rgba(24,39,56,0.035)]'

export const PRIMARY_BUTTON =
  'h-12 rounded-xl border border-[#0da392] bg-gradient-to-br from-[#17bea9] to-[#0d9f91] text-sm font-bold text-white shadow-[0_6px_14px_rgba(13,159,145,0.2)] transition hover:from-[#14ad9a] hover:to-[#0b8f82] active:scale-[0.98] focus-visible:ring-[#14b8a6]'

export const SECONDARY_BUTTON =
  'h-12 rounded-xl border border-[#d9e0e4] bg-white text-sm font-bold text-[#475563] hover:bg-[#f4f6f7] focus-visible:ring-[#14b8a6]'
