import { useSyncExternalStore } from 'react'
import { DEFECTS as SHARED_DEFECTS } from '@/prototype/mockData'
import { getMockDefects, toLocalDateString } from './mockDefects'

// Owner: Jerald
// In-memory sample defects shared by the Inbox and Defect detail pages, so acknowledging
// on one page shows on the other. Resets when the browser page reloads.
//
// Each action only allows the moves in design/workflow-diagram.md. When the API exists,
// replace these with POST /api/defects/:id/acknowledge, /updates, /signoff and /verify
// (the backend makes the real status change through defectService.transition()).

let defects = null
const listeners = new Set()

function current() {
  if (!defects) defects = getMockDefects()
  return defects
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDefects() {
  return useSyncExternalStore(subscribe, current)
}

// For tests: start again from the sample data.
export function resetDefects() {
  defects = null
  listeners.forEach((l) => l())
}

// Applies change(defect) to the defect with this id when it is in one of the allowed statuses.
// The new status is also copied onto the shared prototype record (prototype only), so
// Si Qi's defect panel, the Defects list and the Overview show the same status.
function update(id, allowed, change) {
  defects = current().map((d) => (d.id === id && allowed.includes(d.status) ? { ...d, ...change(d) } : d))
  const updated = defects.find((d) => d.id === id)
  const shared = SHARED_DEFECTS.find((d) => d.id === id)
  if (updated && shared) shared.status = updated.status
  listeners.forEach((l) => l())
}

const event = (title, extra = {}) => ({ title, at: new Date().toISOString(), ...extra })

// open -> acknowledged
export function acknowledgeDefect(id, by) {
  update(id, ['open'], (d) => ({
    status: 'acknowledged',
    history: [event(`Acknowledged by ${by}`), ...d.history],
  }))
}

// Progress note. The first one moves acknowledged -> in_progress.
export function postProgressUpdate(id, by, note) {
  update(id, ['acknowledged', 'in_progress'], (d) => ({
    status: 'in_progress',
    history: [event(note, { by }), ...d.history],
  }))
}

// in_progress -> pending_verification, with the repair photo and e-sign.
export function signOffDefect(id, by, evidenceUrl) {
  update(id, ['in_progress'], (d) => ({
    status: 'pending_verification',
    evidenceUrl,
    history: [event(`Signed off by ${by}`), ...d.history],
  }))
}

// pending_verification -> closed (inspector or admin)
export function approveDefect(id, by) {
  update(id, ['pending_verification'], (d) => ({
    status: 'closed',
    completedDate: toLocalDateString(new Date()),
    history: [event(`Approved by ${by}`, { tone: 'good' }), ...d.history],
  }))
}

// pending_verification -> in_progress, reason required (inspector or admin)
export function rejectDefect(id, by, reason) {
  update(id, ['pending_verification'], (d) => ({
    status: 'in_progress',
    history: [event(`Rejected by ${by}: ${reason}`, { tone: 'warn' }), ...d.history],
  }))
}
