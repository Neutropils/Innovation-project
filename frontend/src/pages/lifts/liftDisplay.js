// Owner: Kwan - display helpers for lifts: search, last-check text and the
// "suggested next checks" rules.

const toDate = (iso) => new Date(`${iso}T00:00:00`)
// Today's date where the inspector is (not UTC), as YYYY-MM-DD
export function todayIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// F01.1 search: every word must appear in the lift code, block, street, town, postal code
// or contractor (case-insensitive), so "512 hougang" finds Blk 512 Hougang Ave 10.
export function matchesLift(lift, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = [lift.liftCode, lift.liftName, lift.street, lift.town, lift.postalCode, lift.contractorName].join(' ').toLowerCase()
  return words.every((w) => haystack.includes(w))
}

// Whole days since the last spot-check; null when the lift has never been checked.
export function daysSinceCheck(lift, today = todayIso()) {
  if (!lift.lastInspectedAt) return null
  return Math.round((toDate(today) - toDate(lift.lastInspectedAt)) / 86400000)
}

export function lastCheckText(lift, today = todayIso()) {
  const days = daysSinceCheck(lift, today)
  if (days === null) return 'Never checked'
  if (days <= 0) return 'Checked today'
  if (days === 1) return 'Checked yesterday'
  return `Checked ${days} days ago`
}

// A lift not spot-checked for longer than this is due for another check.
export const CHECK_INTERVAL_DAYS = 30

// Rules behind "Suggested next checks". Each rule that applies adds to the score and gives
// a reason in plain words, so the inspector can see why a lift is suggested.
//   Never spot-checked            90
//   Past the 30-day interval      30, plus 1 per day late (up to 30)
//   Has overdue defects           40, plus 5 for each one after the first
//   Repairs waiting to be checked 10 each
//   Days since the last check     1 per day (up to 30) - breaks ties, gives no reason
export function checkPriority(lift, today = todayIso()) {
  const reasons = []
  let score = 0
  const days = daysSinceCheck(lift, today)

  if (days === null) {
    score += 90
    reasons.push({ text: 'Never spot-checked', tone: 'warn' })
  } else {
    score += Math.min(days, 30)
    if (days > CHECK_INTERVAL_DAYS) {
      score += 30 + Math.min(days - CHECK_INTERVAL_DAYS, 30)
      reasons.push({ text: `Not checked for ${days} days`, tone: 'warn' })
    }
  }
  if (lift.overdueDefects > 0) {
    score += 40 + (lift.overdueDefects - 1) * 5
    reasons.push({ text: plural(lift.overdueDefects, 'overdue defect'), tone: 'danger' })
  }
  if (lift.pendingVerification > 0) {
    score += lift.pendingVerification * 10
    reasons.push({ text: `${plural(lift.pendingVerification, 'repair')} to verify`, tone: 'info' })
  }
  return { score, reasons }
}

// The lifts most worth checking next, highest score first. Lifts with no reason are left out.
export function suggestedLifts(lifts, limit = 3, today = todayIso()) {
  return lifts
    .map((lift) => ({ lift, ...checkPriority(lift, today) }))
    .filter((s) => s.reasons.length > 0)
    .sort((a, b) => b.score - a.score || a.lift.liftCode.localeCompare(b.lift.liftCode))
    .slice(0, limit)
}

// F01.13: open the lift's address in Google Maps
export function mapsUrl(lift) {
  const address = [`Blk ${lift.block}`, lift.street, 'Singapore', lift.postalCode].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
