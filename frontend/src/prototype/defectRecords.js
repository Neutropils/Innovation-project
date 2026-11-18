// Owner: Si Qi - prototype answers for one defect: detail, rectification history and
// reassignment (F02.2, F02.4, F02.10). Shapes match the real API:
//   GET   /api/defects/:id           -> defect
//   GET   /api/defects/:id/history   -> events, oldest first
//   PATCH /api/defects/:id/assign    { contractorId, reason } -> updated defect
// Reassigning changes the shared DEFECTS rows, so the Defects list and Overview counts follow.
// Everything resets when the page is reloaded.
import { DEFECTS, SEVERITY_DUE_DAYS, day, isOverdue } from './mockData'

const INSPECTOR = { id: 1, name: 'Ivy Tan', role: 'inspector' }
// The demo contractor account of each company (prototype/registerData.js users)
const CONTRACTOR_STAFF = {
  1: { id: 2, name: 'Marcus Lim', role: 'contractor' },
  2: { id: 5, name: 'Priya Nair', role: 'contractor' },
  3: { id: 6, name: 'Hafiz Rahim', role: 'contractor' },
  4: { id: 7, name: 'Wei Ling Goh', role: 'contractor' },
}
// The technician each company sends on site (named in progress notes)
const TECHNICIANS = { 1: 'Tan Wei Ming', 2: 'Raj Kumar', 3: 'Lee Jia Hui', 4: 'Ahmad Faizal' }

// The steps a defect has been through to reach its current status (design/workflow-diagram.md)
const STEPS = ['open', 'acknowledged', 'in_progress', 'pending_verification', 'closed']

// Progress notes that fit the part of the lift the defect is in
const PROGRESS = {
  'Motor room': [
    'Technician checked the machine room and confirmed the fault. Lift kept in service at reduced speed.',
    'Replacement part ordered from the supplier, arriving in 2 working days.',
  ],
  'Lift car': [
    'Technician on site. Fault confirmed inside the car; lift stays in service while we wait for the part.',
    'Replacement part arrived. Fitting booked for tomorrow morning outside peak hours.',
  ],
  'Hoistway and pit': [
    'Technician inspected the hoistway and pit. Lift taken out of service for 2 hours to make it safe.',
    'Work scheduled with a second technician, as the pit needs two people on site.',
  ],
}
// Some demo defects had a repair rejected once, so the history shows that loop too
const REJECTED_ONCE = {
  70: 'Car still stops about 8 mm below level 5. Re-adjust and test at every floor.',
  49: 'New door edge rubber is loose at the top corner. Refit it so it is flush.',
}
const FOLLOW_UP = 'Fixed the point raised by the inspector and re-tested with the inspector’s checklist item.'

// Repair evidence in the demo: the same placeholder image (public/prototype/photo-placeholder.svg)
// in the { id, url } shape the attachments API returns
export const PLACEHOLDER_PHOTO_URL = '/prototype/photo-placeholder.svg'
let nextPhotoId = 1
const placeholderPhotos = (n) => Array.from({ length: n }, () => ({ id: nextPhotoId++, url: PLACEHOLDER_PHOTO_URL }))

const ok = (data, status = 200) => ({ status, body: { success: true, data } })
const fail = (status, code, message) => ({ status, body: { success: false, code, message } })

export function defectDetail(d) {
  return { ...d, description: d.item, location: d.location ?? null, overdue: isOverdue(d) }
}

// History is built once per defect from its current status, then kept so reassignments add to it.
const histories = new Map()
let nextEventId = 1

// The local midnight of a mockData date (written with day(), so look it up the same way)
function startOf(dateIso) {
  let n = 0
  while (n <= 400 && day(-n) !== dateIso) n++
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() - (n > 400 ? 0 : n))
  return t
}

// What the "Defect raised" entry shows: where the defect came from and what was set for it
function createdDetails(d) {
  return {
    inspectionId: d.inspectionId ?? null,
    inspectionCode: d.inspectionId ? `INS-${String(d.inspectionId).padStart(6, '0')}` : null,
    checklistCode: d.checklistItem?.code ?? null,
    checklistText: d.checklistItem?.text ?? null,
    severity: d.severity,
    dueDate: d.dueDate,
    contractorName: d.contractorName,
  }
}

function buildHistory(d) {
  const reached = STEPS.indexOf(d.status)
  const staff = CONTRACTOR_STAFF[d.contractorId] ?? null
  const tech = TECHNICIANS[d.contractorId] ?? 'our technician'
  const inspector = d.raisedBy ? { ...d.raisedBy, role: 'inspector' } : INSPECTOR
  const [startNote, updateNote] = PROGRESS[d.checklistItem?.section] ?? PROGRESS['Lift car']
  const rejectReason = REJECTED_ONCE[d.id]

  const steps = [{ action: 'created', from: null, to: 'open', actor: inspector, note: d.item, details: createdDetails(d) }]
  const signOff = () => steps.push({
    action: 'status_change', from: 'in_progress', to: 'pending_verification', actor: staff,
    note: `Repair done by ${tech} and tested 10 times with no fault. Signed off for inspection.`,
    details: { photos: placeholderPhotos(2), confirmed: true },
  })
  if (reached >= 1) {
    steps.push({ action: 'status_change', from: 'open', to: 'acknowledged', actor: staff, note: `Seen. Assigned to our technician ${tech}.` })
  }
  if (reached >= 2) {
    steps.push({ action: 'status_change', from: 'acknowledged', to: 'in_progress', actor: staff, note: startNote })
    steps.push({ action: 'update_posted', from: null, to: null, actor: staff, note: updateNote })
  }
  if (rejectReason && reached >= 2) {
    signOff()
    steps.push({ action: 'status_change', from: 'pending_verification', to: 'in_progress', actor: inspector, note: rejectReason })
    if (reached >= 3) steps.push({ action: 'update_posted', from: null, to: null, actor: staff, note: FOLLOW_UP })
  }
  if (reached >= 3) signOff()
  if (reached >= 4) {
    steps.push({ action: 'status_change', from: 'pending_verification', to: 'closed', actor: inspector, note: 'Checked on site. Repair works correctly - defect closed.' })
  }

  // Spread the steps over the days since the defect was raised, in order and never in the future
  const start = startOf(d.createdAt)
  const span = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000))
  const latest = Date.now() - 5 * 60 * 1000
  return steps.map((s, i) => {
    const t = new Date(start)
    t.setDate(t.getDate() + Math.floor((span * i) / steps.length))
    t.setHours(10 + (i % 8), 30, 0, 0)
    const time = Math.min(t.getTime(), latest - (steps.length - i) * 60 * 1000)
    return {
      id: nextEventId++, action: s.action, fromStatus: s.from, toStatus: s.to, note: s.note,
      details: s.details ?? null, createdAt: new Date(time).toISOString(), actor: s.actor,
    }
  })
}

function historyOf(d) {
  if (!histories.has(d.id)) histories.set(d.id, buildHistory(d))
  return histories.get(d.id)
}

// Back to the demo data (used by tests).
export function resetDefectRecords() {
  histories.clear()
  nextEventId = 1
  nextPhotoId = 1
}

// ─── F02.1 automatic defect creation ──────────────────────────────────────────

const dayIso = (offset = 0) => day(offset)

// Prototype twin of defectService.createFromInspection(): called when an inspection is submitted.
// One 'open' defect per Defect answer, assigned to the lift's contractor, due date from its
// severity, linked to the inspection and lift so nothing is typed twice. Safe to call twice:
// an answer that already has a defect is skipped. Returns the new defects.
//   inspection  { id, results: [{ id, result, itemCode, section, itemText, description, location, severity }] }
//   lift        register lift ({ id, liftCode, liftName, contractorId })
//   contractor  register contractor ({ id, name })
//   inspector   { id, name } - the signed-in inspector, shown in the defect's history
export function createDefectsFromInspection(inspection, { lift, contractor, inspector }) {
  const created = []
  for (const r of inspection.results) {
    if (r.result !== 'defect') continue
    if (DEFECTS.some((d) => d.inspectionResultId === r.id)) continue
    if (!SEVERITY_DUE_DAYS[r.severity]) throw new Error(`Checklist answer ${r.id} is a defect but has no severity`)

    const id = Math.max(0, ...DEFECTS.map((d) => d.id)) + 1
    const defect = {
      id,
      code: `DEF-${String(id).padStart(6, '0')}`,
      liftId: lift.id,
      liftCode: lift.liftCode,
      liftName: lift.liftName,
      item: r.description?.trim() || r.itemText || 'Defect found during spot-check',
      severity: r.severity,
      status: 'open',
      contractorId: contractor.id,
      contractorName: contractor.name,
      createdAt: dayIso(0),
      dueDate: dayIso(SEVERITY_DUE_DAYS[r.severity]),
      inspectionId: inspection.id,
      inspectionCode: `INS-${String(inspection.id).padStart(6, '0')}`,
      inspectionResultId: r.id,
      checklistItem: { code: r.itemCode ?? null, section: r.section ?? null, text: r.itemText ?? null },
      raisedBy: { id: inspector.id, name: inspector.name },
      location: r.location ?? r.section ?? null,
    }
    DEFECTS.push(defect)
    histories.set(id, [{
      id: nextEventId++, action: 'created', fromStatus: null, toStatus: 'open', note: defect.item,
      details: createdDetails(defect),
      createdAt: new Date().toISOString(), actor: { id: inspector.id, name: inspector.name, role: 'inspector' },
    }])
    created.push(defect)
  }
  return created
}

// Answers /defects/:id, /defects/:id/history and /defects/:id/assign; null for anything else.
// findContractor(id) returns the register's contractor (or null), so contractors added on the
// Admin page can be chosen too. `actor` is the signed-in user.
export function defectRecordRequest({ method, path, body = {}, findContractor, actor }) {
  const [, idText, sub] = path.match(/\/defects\/(\d+)(?:\/(history|assign))?$/) ?? []
  if (!idText) return null
  const defect = DEFECTS.find((d) => d.id === Number(idText))

  if (method === 'get' && !sub) return defect ? ok(defectDetail(defect)) : fail(404, 'NOT_FOUND', 'Defect not found')
  if (method === 'get' && sub === 'history') return defect ? ok(historyOf(defect)) : fail(404, 'NOT_FOUND', 'Defect not found')
  if (method !== 'patch' || sub !== 'assign') return null

  // Same checks and messages as defectValidator + defectService.reassign on the backend
  if (!defect) return fail(404, 'NOT_FOUND', 'Defect not found')
  const reason = String(body.reason ?? '').trim()
  const contractorId = Number(body.contractorId)
  if (!Number.isInteger(contractorId) || contractorId <= 0) return fail(422, 'VALIDATION_ERROR', 'Choose a contractor')
  if (reason.length < 3) return fail(422, 'VALIDATION_ERROR', 'Give a reason of at least 3 characters')
  if (reason.length > 500) return fail(422, 'VALIDATION_ERROR', 'Reason must be 500 characters or fewer')
  if (defect.status === 'closed') return fail(409, 'DEFECT_CLOSED', 'A closed defect cannot be reassigned')
  if (defect.contractorId === contractorId) return fail(422, 'VALIDATION_ERROR', 'The defect is already assigned to this contractor')
  const to = findContractor(contractorId)
  if (!to || to.isActive === false) return fail(422, 'VALIDATION_ERROR', 'Choose an active contractor')

  const history = historyOf(defect)   // build the past before the company changes
  history.push({
    id: nextEventId++,
    action: 'reassigned',
    fromStatus: null,
    toStatus: null,
    note: `From ${defect.contractorName} to ${to.name}. Reason: ${reason}`,
    details: { fromContractor: defect.contractorName, toContractor: to.name },
    createdAt: new Date().toISOString(),
    actor,
  })
  defect.contractorId = to.id
  defect.contractorName = to.name
  return ok(defectDetail(defect))
}
