// Prototype stand-in for the inspection API (Kandha's endpoints), so the whole loop can be
// demoed with no backend: start an inspection -> answer the checklist -> submit -> the failed
// items appear as open defects (F02.1) -> the Overview counts the inspection (F08.4).
// Shapes copy backend/src/services/inspectionService.js, so Kandha's pages work unchanged:
//   GET  /api/checklist-items                 sections + meta.severityDueDays
//   POST /api/inspections        { liftId }   the inspector's draft for that lift (201 new, 200 existing)
//   GET  /api/inspections?status=&liftId=&from=&to=&result=&inspectionId=   history
//   GET  /api/inspections/export              CSV, same filters
//   GET  /api/inspections/:id                 detail (a draft only for its own inspector)
//   PUT  /api/inspections/:id/results         save draft answers
//   POST /api/inspections/:id/submit          validate, submit, create defects
// Everything is kept in memory and resets when the page is reloaded.
import { DEFECTS, PERIOD_DAYS, SEVERITY_DUE_DAYS, day } from './mockData'
import { createDefectsFromInspection } from './defectRecords'

// Same placeholder checklist as backend/src/seed.js (25 items in 3 sections)
const CHECKLIST_ROWS = [
  ['Motor room', 'MR-01', 'Machine and motor run without abnormal noise or vibration'],
  ['Motor room', 'MR-02', 'Brake operates correctly and brake linings are not worn'],
  ['Motor room', 'MR-03', 'Controller panel is closed, labelled and free of burn marks'],
  ['Motor room', 'MR-04', 'Overspeed governor and its seal are intact'],
  ['Motor room', 'MR-05', 'Suspension ropes show no broken wires or excessive wear'],
  ['Motor room', 'MR-06', 'Motor room lighting and ventilation are working'],
  ['Motor room', 'MR-07', 'Rescue device and instructions are in place'],
  ['Motor room', 'MR-08', 'Motor room door is locked and warning signage is displayed'],
  ['Lift car', 'LC-01', 'Car doors open and close smoothly'],
  ['Lift car', 'LC-02', 'Door safety edge or sensor reopens the doors'],
  ['Lift car', 'LC-03', 'All car buttons respond and light up'],
  ['Lift car', 'LC-04', 'Alarm bell and intercom reach the help line'],
  ['Lift car', 'LC-05', 'Emergency light works when power is cut'],
  ['Lift car', 'LC-06', 'Car stops level with each landing'],
  ['Lift car', 'LC-07', 'Car ventilation fan is working'],
  ['Lift car', 'LC-08', 'Car lighting and floor indicator are working'],
  ['Lift car', 'LC-09', 'Lift licence and capacity notice are displayed'],
  ['Hoistway and pit', 'HP-01', 'Landing doors close fully and cannot be opened without the car'],
  ['Hoistway and pit', 'HP-02', 'Landing door locks engage correctly'],
  ['Hoistway and pit', 'HP-03', 'Landing call buttons and indicators work at every floor'],
  ['Hoistway and pit', 'HP-04', 'Pit is dry and free of rubbish'],
  ['Hoistway and pit', 'HP-05', 'Buffers are in place and undamaged'],
  ['Hoistway and pit', 'HP-06', 'Pit stop switch cuts power to the lift'],
  ['Hoistway and pit', 'HP-07', 'Pit lighting is working'],
  ['Hoistway and pit', 'HP-08', 'Counterweight guard is in place'],
]

export const CHECKLIST = CHECKLIST_ROWS.map(([section, code, description], i) => ({
  id: i + 1, section, code, description, sortOrder: i + 1,
}))
const itemByCode = (code) => CHECKLIST.find((i) => i.code === code)

// Demo inspectors (prototype/registerData.js users)
const INSPECTORS = [{ id: 1, name: 'Ivy Tan' }, { id: 4, name: 'Darren Ong' }]

// The checklist item behind each demo defect in mockData.js
const DEFECT_ITEM = {
  88: 'LC-02', 81: 'MR-02', 79: 'LC-08', 74: 'HP-01', 72: 'LC-04', 70: 'LC-06', 66: 'HP-07',
  63: 'MR-03', 60: 'LC-05', 57: 'LC-01', 52: 'MR-04', 49: 'LC-02', 45: 'HP-04', 41: 'HP-05',
}
// Lifts that get routine all-pass checks (LIFT-0903 has never been inspected in the register)
const ROUTINE_LIFTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]
const ROUTINE_DAYS = 60

let inspections = []
let nextInspectionId = 1
let nextResultId = 1

// A time `daysAgo` days back at `hour`, never later than now
function timeAgo(daysAgo, hour) {
  const t = new Date()
  t.setDate(t.getDate() - daysAgo)
  t.setHours(hour, 30, 0, 0)
  return new Date(Math.min(t.getTime(), Date.now() - 60 * 60 * 1000)).toISOString()
}

// How many days ago a mockData date was (written with the same day() helper, so it always matches)
const daysSince = (dateIso) => {
  for (let n = 0; n <= 400; n++) if (day(-n) === dateIso) return n
  return 0
}

function allPass() {
  return CHECKLIST.map((item) => ({
    id: nextResultId++, checklistItemId: item.id, result: 'pass', description: null, location: null, severity: null,
  }))
}

// Back to the demo data (also used by tests). Links each demo defect to the inspection that found it.
export function resetInspections() {
  inspections = []
  nextResultId = 1
  const seeds = []

  for (const d of DEFECTS) {
    if (DEFECT_ITEM[d.id]) seeds.push({ when: timeAgo(daysSince(d.createdAt), 10), liftId: d.liftId, defect: d })
  }
  for (let k = 1; k <= ROUTINE_DAYS; k++) {
    if (k % 7 === 0) continue   // a quiet day each week
    seeds.push({ when: timeAgo(k, 14), liftId: ROUTINE_LIFTS[(k * 5) % ROUTINE_LIFTS.length] })
  }
  seeds.sort((a, b) => a.when.localeCompare(b.when))

  seeds.forEach((seed, i) => {
    const inspector = INSPECTORS[i % INSPECTORS.length]
    const results = allPass()
    const insp = {
      id: i + 1, liftId: seed.liftId, inspectorId: inspector.id, inspectorName: inspector.name,
      status: 'submitted', createdAt: seed.when, submittedAt: seed.when, results,
    }
    if (seed.defect) {
      const item = itemByCode(DEFECT_ITEM[seed.defect.id])
      const r = results.find((x) => x.checklistItemId === item.id)
      Object.assign(r, { result: 'defect', description: seed.defect.item, location: item.section, severity: seed.defect.severity })
      Object.assign(seed.defect, {
        inspectionId: insp.id,
        inspectionCode: `INS-${String(insp.id).padStart(6, '0')}`,
        inspectionResultId: r.id,
        checklistItem: { code: item.code, section: item.section, text: item.description },
        raisedBy: { id: inspector.id, name: inspector.name },
        location: item.section,
      })
    }
    inspections.push(insp)
  })
  nextInspectionId = inspections.length + 1

  // One unfinished draft for the demo inspector, so "Drafts" has something to reopen
  const draft = {
    id: nextInspectionId++, liftId: 2, inspectorId: 1, inspectorName: 'Ivy Tan',
    status: 'draft', createdAt: timeAgo(0, 8), submittedAt: null,
    results: CHECKLIST.slice(0, 6).map((item) => ({
      id: nextResultId++, checklistItemId: item.id, result: 'pass', description: null, location: null, severity: null,
    })),
  }
  inspections.push(draft)
}
resetInspections()

// ─── F08.4: inspections submitted in an Overview period ───────────────────────

export function countSubmittedInspections(period = 'month') {
  const days = PERIOD_DAYS[period] ?? Infinity
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - days)
  return inspections.filter((i) => i.status === 'submitted' && (days === Infinity || new Date(i.submittedAt) >= start)).length
}

// ─── Response shapes (same as inspectionService.js) ───────────────────────────

const pad = (id) => String(id).padStart(6, '0')
const displayId = (id) => `INS-${pad(id)}`
const isBlank = (v) => v === null || v === undefined || String(v).trim() === ''
const addressOf = (lift) => [lift.block && `Blk ${lift.block}`, lift.street, lift.town].filter(Boolean).join(', ')

function toDetail(insp, { findLift, findContractor }) {
  const lift = findLift(insp.liftId) ?? { id: insp.liftId }
  const contractor = lift.contractorId ? findContractor(lift.contractorId) : null
  const byItem = new Map(insp.results.map((r) => [r.checklistItemId, r]))
  const defectRows = DEFECTS.filter((d) => d.inspectionId === insp.id)
  const defectByResult = new Map(defectRows.map((d) => [d.inspectionResultId, d]))

  const results = CHECKLIST.map((item) => {
    const r = byItem.get(item.id)
    const defect = r ? defectByResult.get(r.id) : undefined
    return {
      checklistItemId: item.id, code: item.code, section: item.section, itemText: item.description, sortOrder: item.sortOrder,
      result: r?.result ?? null, description: r?.description ?? null, location: r?.location ?? null,
      severity: r?.severity ?? null, photos: [], defectId: defect?.id ?? null,
    }
  })
  const defects = defectRows.map((d) => {
    const entry = results.find((r) => r.defectId === d.id)
    return {
      id: d.id, displayId: d.code, inspectionResultId: d.inspectionResultId, description: d.item,
      location: d.location ?? entry?.location ?? null, severity: d.severity, status: d.status, dueDate: d.dueDate,
      checklistItemId: entry?.checklistItemId ?? null, itemCode: entry?.code ?? null, itemText: entry?.itemText ?? null,
    }
  })
  const pass = results.filter((r) => r.result === 'pass').length
  const defect = results.filter((r) => r.result === 'defect').length
  return {
    id: insp.id,
    displayId: displayId(insp.id),
    status: insp.status,
    remarks: null,
    createdAt: insp.createdAt,
    submittedAt: insp.submittedAt,
    lift: {
      id: lift.id, liftCode: lift.liftCode, block: lift.block, street: lift.street,
      town: lift.town, postalCode: lift.postalCode, address: addressOf(lift),
    },
    contractor: contractor ? { id: contractor.id, name: contractor.name } : null,
    inspector: { id: insp.inspectorId, name: insp.inspectorName },
    counts: { total: CHECKLIST.length, answered: pass + defect, pass, defect },
    results,
    defects,
  }
}

const dayStart = (ymd) => new Date(`${ymd}T00:00:00`)
const dayEnd = (ymd) => new Date(`${ymd}T23:59:59.999`)

function listInspections(params, user, deps) {
  const { status, liftId, from, to, result, inspectionId } = params
  const ownDraft = (i) => i.status === 'draft' && user?.role === 'inspector' && i.inspectorId === user.id
  const dateField = status === 'draft' ? 'createdAt' : 'submittedAt'

  let list = inspections.filter((i) => {
    if (status === 'draft' && !ownDraft(i)) return false
    if (status === 'submitted' && i.status !== 'submitted') return false
    if (!status && i.status !== 'submitted' && !ownDraft(i)) return false
    if (inspectionId && i.id !== Number(inspectionId)) return false
    if (liftId && i.liftId !== Number(liftId)) return false
    const when = i[dateField] ? new Date(i[dateField]) : null
    if (from && (!when || when < dayStart(from))) return false
    if (to && (!when || when > dayEnd(to))) return false
    return true
  }).map((i) => {
    const lift = deps.findLift(i.liftId) ?? {}
    const passCount = i.results.filter((r) => r.result === 'pass').length
    const defectCount = i.results.filter((r) => r.result === 'defect').length
    return {
      id: i.id, displayId: displayId(i.id), status: i.status, liftId: i.liftId,
      liftCode: lift.liftCode ?? null, address: lift.block ? addressOf(lift) : null,
      contractorName: lift.contractorName ?? null, inspectorName: i.inspectorName,
      createdAt: i.createdAt, submittedAt: i.submittedAt, totalItems: CHECKLIST.length,
      answeredCount: passCount + defectCount, passCount, defectCount,
    }
  })
  if (result === 'defect') list = list.filter((i) => i.defectCount > 0)
  if (result === 'pass') list = list.filter((i) => i.defectCount === 0)
  return list.sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt) || b.id - a.id)
}

const CSV_COLUMNS = [
  'inspection_id', 'lift_code', 'address', 'contractor', 'inspector', 'submitted_at',
  'item_code', 'item_text', 'section', 'result', 'severity', 'description', 'location', 'defect_id',
]
function csvCell(value) {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportCsv(params, user, deps) {
  const lines = [CSV_COLUMNS.join(',')]
  for (const row of listInspections({ ...params, status: 'submitted' }, user, deps)) {
    const insp = inspections.find((i) => i.id === row.id)
    for (const r of insp.results) {
      if (!r.result) continue
      const item = CHECKLIST.find((c) => c.id === r.checklistItemId)
      const defect = DEFECTS.find((d) => d.inspectionResultId === r.id)
      const cells = {
        inspection_id: row.displayId, lift_code: row.liftCode, address: row.address, contractor: row.contractorName,
        inspector: row.inspectorName, submitted_at: row.submittedAt, item_code: item.code, item_text: item.description,
        section: item.section, result: r.result, severity: r.severity, description: r.description,
        location: r.location, defect_id: defect ? defect.code : '',
      }
      lines.push(CSV_COLUMNS.map((c) => csvCell(cells[c])).join(','))
    }
  }
  return `${lines.join('\r\n')}\r\n`
}

// ─── Request handler ──────────────────────────────────────────────────────────

const ok = (data, status = 200, extra = {}) => ({ status, body: { success: true, data, ...extra } })
const fail = (status, code, message, extra = {}) => ({ status, body: { success: false, code, message, ...extra } })

// The caller's draft, or the reason they can't write to this inspection
function ownDraft(id, user) {
  const insp = inspections.find((i) => i.id === id)
  if (!insp) return { error: fail(404, 'NOT_FOUND', 'Inspection not found') }
  if (insp.inspectorId !== user?.id) {
    if (insp.status === 'draft') return { error: fail(404, 'NOT_FOUND', 'Inspection not found') }
    return { error: fail(403, 'FORBIDDEN', 'Only the inspector who ran this check can change it') }
  }
  if (insp.status !== 'draft') {
    return { error: fail(409, 'ALREADY_SUBMITTED', 'This inspection has already been submitted and can no longer be changed') }
  }
  return { insp }
}

// Answers /checklist-items and /inspections...; null for anything else.
// deps: findLift(id), findContractor(id) from the register. user: the signed-in { id, name, role }.
// empty: the "Empty" demo scenario (history comes back with nothing).
export function inspectionRequest({ method, path, body = {}, params = {}, user, deps, empty = false }) {
  if (path.endsWith('/checklist-items') && method === 'get') {
    const sections = []
    for (const item of CHECKLIST) {
      let group = sections.find((s) => s.section === item.section)
      if (!group) sections.push((group = { section: item.section, items: [] }))
      group.items.push({ id: item.id, code: item.code, description: item.description, sortOrder: item.sortOrder })
    }
    return ok(sections, 200, { meta: { total: CHECKLIST.length, severityDueDays: SEVERITY_DUE_DAYS } })
  }

  const match = path.match(/\/inspections(?:\/([\w-]+))?(?:\/(results|submit))?$/)
  if (!match) return null
  const [, rest, action] = match

  if (!rest) {
    if (method === 'get') return ok(empty ? [] : listInspections(params, user, deps))
    if (method !== 'post') return null
    // Start (or reopen) the inspector's draft for a lift
    if (user?.role !== 'inspector') return fail(403, 'FORBIDDEN', 'Only inspectors can start an inspection')
    const liftId = Number(body.liftId)
    const lift = Number.isInteger(liftId) && liftId > 0 ? deps.findLift(liftId) : null
    if (!lift || lift.isActive === false) return fail(404, 'NOT_FOUND', 'Lift not found')
    const existing = inspections.find((i) => i.status === 'draft' && i.liftId === liftId && i.inspectorId === user.id)
    if (existing) return ok(toDetail(existing, deps))
    const draft = {
      id: nextInspectionId++, liftId, inspectorId: user.id, inspectorName: user.name,
      status: 'draft', createdAt: new Date().toISOString(), submittedAt: null, results: [],
    }
    inspections.push(draft)
    return ok(toDetail(draft, deps), 201)
  }

  if (rest === 'export' && !action && method === 'get') {
    return { status: 200, body: empty ? `${CSV_COLUMNS.join(',')}\r\n` : exportCsv(params, user, deps) }
  }

  const id = Number(rest)
  if (!Number.isInteger(id) || id <= 0) return fail(404, 'NOT_FOUND', 'Inspection not found')

  if (!action && method === 'get') {
    const insp = inspections.find((i) => i.id === id)
    if (!insp || (insp.status === 'draft' && insp.inspectorId !== user?.id)) return fail(404, 'NOT_FOUND', 'Inspection not found')
    return ok(toDetail(insp, deps))
  }

  if (action === 'results' && method === 'put') {
    const { insp, error } = ownDraft(id, user)
    if (error) return error
    const entries = Array.isArray(body.results) ? body.results : []
    if (!entries.length) return fail(422, 'VALIDATION_ERROR', 'results must not be empty')
    const unknown = entries.filter((e) => !CHECKLIST.some((c) => c.id === e.checklistItemId)).map((e) => e.checklistItemId)
    if (unknown.length) return fail(422, 'VALIDATION_ERROR', `Unknown checklist item: ${unknown.join(', ')}`)
    for (const e of entries) {
      const isDefect = e.result === 'defect'
      const section = CHECKLIST.find((c) => c.id === e.checklistItemId).section
      const values = {
        result: e.result ?? null,
        description: isDefect && !isBlank(e.description) ? String(e.description).trim() : null,
        location: isDefect ? (isBlank(e.location) ? section : String(e.location).trim()) : null,
        severity: isDefect ? e.severity ?? null : null,
      }
      const existing = insp.results.find((r) => r.checklistItemId === e.checklistItemId)
      if (existing) Object.assign(existing, values)
      else insp.results.push({ id: nextResultId++, checklistItemId: e.checklistItemId, ...values })
    }
    return ok(toDetail(insp, deps))
  }

  if (action === 'submit' && method === 'post') {
    const { insp, error } = ownDraft(id, user)
    if (error) return error
    const unanswered = []
    const incompleteDefects = []
    for (const item of CHECKLIST) {
      const r = insp.results.find((x) => x.checklistItemId === item.id)
      if (!r || (r.result !== 'pass' && r.result !== 'defect')) unanswered.push(item.id)
      else if (r.result === 'defect' && (isBlank(r.description) || isBlank(r.severity))) incompleteDefects.push(item.id)
    }
    if (unanswered.length || incompleteDefects.length) {
      const parts = []
      if (unanswered.length) parts.push(`${unanswered.length} ${unanswered.length === 1 ? 'item is' : 'items are'} not answered`)
      if (incompleteDefects.length) parts.push(`${incompleteDefects.length} ${incompleteDefects.length === 1 ? 'defect needs' : 'defects need'} a description and severity`)
      return fail(422, 'VALIDATION_ERROR', parts.join(' · '), { error: 'VALIDATION_FAILED', unanswered, incompleteDefects })
    }

    // F02.1: failed items become open defects for the lift's contractor (Si Qi's defectRecords.js)
    const lift = deps.findLift(insp.liftId)
    const contractor = lift ? deps.findContractor(lift.contractorId) : null
    if (!lift || !contractor) return fail(422, 'VALIDATION_ERROR', 'This lift has no contractor to assign its defects to')
    const results = insp.results.map((r) => {
      const item = CHECKLIST.find((c) => c.id === r.checklistItemId)
      return { ...r, itemCode: item?.code, section: item?.section, itemText: item?.description }
    })
    createDefectsFromInspection({ id: insp.id, results }, { lift, contractor, inspector: { id: insp.inspectorId, name: insp.inspectorName } })

    insp.status = 'submitted'
    insp.submittedAt = new Date().toISOString()
    return ok(toDetail(insp, deps))
  }

  return null
}
