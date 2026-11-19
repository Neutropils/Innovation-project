import { CONTRACTORS, DEFECTS } from '@/prototype/mockData'

// Owner: Jerald
// Sample defects for the Inbox and Defect detail until the API is built.
// Built from the team's shared prototype data (src/prototype/mockData.js, read only), so a defect
// number means the same defect on every page - the Inbox, Si Qi's panel, the Defects list.
// Dates come from that data, which is already relative to today.

// 'YYYY-MM-DD' in the device's local time (toISOString would give the UTC date).
export function toLocalDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function contractorNameFor(contractorId) {
  return CONTRACTORS.find((c) => c.id === contractorId)?.name ?? 'Your company'
}

const STEPS = ['open', 'acknowledged', 'in_progress', 'pending_verification', 'closed']
const INSPECTOR_NAME = 'Ivy Tan'

// ISO timestamp `days` after a 'YYYY-MM-DD' date at a local 'HH:MM'
function at(dateStr, days, time) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d + days, h, min).toISOString()
}

// A believable history for the defect's current status (newest first).
function historyFor(d) {
  const reached = (status) => STEPS.indexOf(d.status) >= STEPS.indexOf(status)
  const events = [
    { title: `Defect reported by ${INSPECTOR_NAME}`, at: at(d.createdAt, 0, '09:30') },
    { title: `Defect assigned to ${d.contractorName}`, at: at(d.createdAt, 0, '09:42') },
  ]
  if (reached('acknowledged')) events.push({ title: `Acknowledged by ${d.contractorName}`, at: at(d.createdAt, 0, '14:10') })
  if (reached('in_progress')) events.push({ title: 'Started repair work on site', by: d.contractorName, at: at(d.createdAt, 0, '16:25') })
  if (reached('pending_verification')) events.push({ title: `Signed off by ${d.contractorName}`, at: at(d.createdAt, 0, '17:05') })
  if (reached('closed')) events.push({ title: `Approved by ${INSPECTOR_NAME}`, tone: 'good', at: at(d.createdAt, 1, '10:20') })
  return events.reverse()
}

// Shared prototype defect -> the shape the contractor pages use.
// Called once per page load (see defectStore.js).
export function getMockDefects() {
  return DEFECTS.map((d) => ({
    id: d.id,
    code: d.code,
    severity: d.severity.charAt(0).toUpperCase() + d.severity.slice(1),
    liftCode: d.liftCode,
    address: d.liftName,
    description: d.item,
    photoLabel: 'Inspection photo',
    status: d.status,
    contractorId: d.contractorId,
    contractorName: d.contractorName,
    reportedAt: at(d.createdAt, 0, '09:30'),
    dueDate: d.dueDate,
    dueTime: '17:00',
    ...(d.status === 'closed' && { completedDate: toLocalDateString(new Date(at(d.createdAt, 1, '10:20'))) }),
    history: historyFor(d),
  }))
}
