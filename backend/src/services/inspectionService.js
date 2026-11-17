// Owner: Kandha - inspections: checklist, drafts, submit, history, CSV export (F01.3-F01.12, F05.3)
//
// Business logic only: no req/res here. Controllers turn thrown appError()s into responses.
// Defects are NEVER written from this file - submit() calls defectService.createFromInspection(),
// which is the only way a defect is created from an inspection.
const { Op } = require('sequelize')
const sequelize = require('../config')
const {
  Inspection, InspectionResult, ChecklistItem, Lift, Contractor, User, Defect, Attachment,
} = require('../models')
const defectService = require('./defectService')
const { appError } = require('../utils')

// ─── Small helpers ────────────────────────────────────────────────────────────

const pad = (id) => String(id).padStart(6, '0')
const inspectionDisplayId = (id) => `INS-${pad(id)}`
const defectDisplayId = (id) => `DEF-${pad(id)}`

const isBlank = (value) => value === null || value === undefined || String(value).trim() === ''
const addressOf = (lift) => [lift.block && `Blk ${lift.block}`, lift.street, lift.town].filter(Boolean).join(', ')
const plain = (row) => (row && typeof row.get === 'function' ? row.get({ plain: true }) : row)

// 'YYYY-MM-DD' -> start / end of that day (server local time)
const startOfDay = (ymd) => new Date(`${ymd}T00:00:00`)
const endOfDay = (ymd) => new Date(`${ymd}T23:59:59.999`)

async function activeItems({ transaction } = {}) {
  return ChecklistItem.findAll({
    where: { isActive: true },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    transaction,
  })
}

// ─── Checklist (F01.3) ────────────────────────────────────────────────────────

// Active items grouped by section, in checklist order.
async function getChecklist() {
  const items = await activeItems()
  const sections = []
  for (const item of items) {
    let group = sections.find((s) => s.section === item.section)
    if (!group) {
      group = { section: item.section, items: [] }
      sections.push(group)
    }
    group.items.push({ id: item.id, code: item.code, description: item.description, sortOrder: item.sortOrder })
  }
  return {
    sections,
    meta: { total: items.length, severityDueDays: defectService.SEVERITY_DUE_DAYS },
  }
}

// ─── Reading one inspection (F01.12) ──────────────────────────────────────────

// A draft is private to its inspector: everyone else gets a plain 404.
function assertVisible(inspection, user) {
  if (!inspection) throw appError(404, 'NOT_FOUND', 'Inspection not found')
  if (inspection.status === 'draft' && inspection.inspectorId !== user.sub) {
    throw appError(404, 'NOT_FOUND', 'Inspection not found')
  }
}

function formatDetail(inspection, items) {
  const row = plain(inspection)
  const resultsByItem = new Map((row.results || []).map((r) => [r.checklistItemId, r]))
  const defects = (row.defects || []).map((d) => ({
    id: d.id,
    displayId: defectDisplayId(d.id),
    inspectionResultId: d.inspectionResultId,
    description: d.description,
    location: d.location,
    severity: d.severity,
    status: d.status,
    dueDate: d.dueDate,
  }))
  const defectByResult = new Map(defects.map((d) => [d.inspectionResultId, d]))

  // One entry per active item (answered or not), so the checklist page and the report
  // can both render straight from this list.
  const results = items.map((item) => {
    const r = resultsByItem.get(item.id)
    const defect = r ? defectByResult.get(r.id) : undefined
    return {
      checklistItemId: item.id,
      code: item.code,
      section: item.section,
      itemText: item.description,
      sortOrder: item.sortOrder,
      result: r?.result ?? null,
      description: r?.defectDescription ?? null,
      location: r?.defectLocation ?? null,
      severity: r?.severity ?? null,
      photos: (r?.photos || []).map((p) => ({ id: p.id, url: p.url })),
      defectId: defect?.id ?? null,
    }
  })
  for (const d of defects) {
    const entry = results.find((r) => r.defectId === d.id)
    d.checklistItemId = entry?.checklistItemId ?? null
    d.itemCode = entry?.code ?? null
    d.itemText = entry?.itemText ?? null
  }

  const pass = results.filter((r) => r.result === 'pass').length
  const defect = results.filter((r) => r.result === 'defect').length
  const lift = row.lift || {}
  return {
    id: row.id,
    displayId: inspectionDisplayId(row.id),
    status: row.status,
    remarks: row.remarks ?? null,
    createdAt: row.createdAt,
    submittedAt: row.submittedAt,
    lift: {
      id: lift.id, liftCode: lift.liftCode, block: lift.block, street: lift.street,
      town: lift.town, postalCode: lift.postalCode, address: addressOf(lift),
    },
    contractor: lift.contractor ? { id: lift.contractor.id, name: lift.contractor.name } : null,
    inspector: row.inspector ? { id: row.inspector.id, name: row.inspector.name } : null,
    counts: { total: items.length, answered: pass + defect, pass, defect },
    results,
    defects,
  }
}

async function loadDetail(id, user) {
  const inspection = await Inspection.findByPk(id, {
    include: [
      { model: Lift, as: 'lift', include: [{ model: Contractor, as: 'contractor', attributes: ['id', 'name'] }] },
      { model: User, as: 'inspector', attributes: ['id', 'name'] },
      {
        model: InspectionResult,
        as: 'results',
        include: [{ model: Attachment, as: 'photos', attributes: ['id', 'url'], required: false }],
      },
      { model: Defect, as: 'defects' },
    ],
  })
  assertVisible(inspection, user)
  return formatDetail(inspection, await activeItems())
}

// ─── Starting a draft (F01.8) ─────────────────────────────────────────────────

// One open draft per inspector per lift: starting again just reopens it.
async function createOrGetDraft(user, liftId) {
  const lift = await Lift.findByPk(liftId)
  if (!lift || lift.isActive === false) throw appError(404, 'NOT_FOUND', 'Lift not found')

  const existing = await Inspection.findOne({
    where: { liftId, inspectorId: user.sub, status: 'draft' },
    order: [['id', 'DESC']],
  })
  if (existing) return { created: false, inspection: await loadDetail(existing.id, user) }

  // The inspector always comes from the login, never from the request body
  const draft = await Inspection.create({ liftId, inspectorId: user.sub, status: 'draft' })
  return { created: true, inspection: await loadDetail(draft.id, user) }
}

// ─── Saving answers (F01.4, F01.6, F01.9) ─────────────────────────────────────

// Checks the caller may write to this inspection and returns the row.
async function loadOwnDraft(id, user, { transaction, lock } = {}) {
  const inspection = await Inspection.findByPk(id, { transaction, ...(lock && { lock }) })
  if (!inspection) throw appError(404, 'NOT_FOUND', 'Inspection not found')
  if (inspection.inspectorId !== user.sub) {
    // Someone else's draft is invisible; someone else's submitted record is visible but read-only
    if (inspection.status === 'draft') throw appError(404, 'NOT_FOUND', 'Inspection not found')
    throw appError(403, 'FORBIDDEN', 'Only the inspector who ran this check can change it')
  }
  if (inspection.status !== 'draft') {
    throw appError(409, 'ALREADY_SUBMITTED', 'This inspection has already been submitted and can no longer be changed')
  }
  return inspection
}

// Upserts one row per (inspection, item). Partial saves are fine - a draft can be incomplete.
async function saveResults(user, id, entries) {
  await sequelize.transaction(async (transaction) => {
    const inspection = await loadOwnDraft(id, user, { transaction, lock: transaction.LOCK.UPDATE })
    const items = await activeItems({ transaction })
    const itemById = new Map(items.map((i) => [i.id, i]))

    const unknown = entries.filter((e) => !itemById.has(e.checklistItemId)).map((e) => e.checklistItemId)
    if (unknown.length) {
      throw appError(422, 'VALIDATION_ERROR', `Unknown checklist item: ${unknown.join(', ')}`)
    }

    for (const entry of entries) {
      const isDefect = entry.result === 'defect'
      const values = {
        result: entry.result ?? null,
        // Defect details only mean something on a Defect answer; clear them if it flips to Pass
        defectDescription: isDefect && !isBlank(entry.description) ? entry.description : null,
        defectLocation: isDefect ? (isBlank(entry.location) ? itemById.get(entry.checklistItemId).section : entry.location) : null,
        severity: isDefect ? entry.severity ?? null : null,
      }
      const existing = await InspectionResult.findOne({
        where: { inspectionId: inspection.id, checklistItemId: entry.checklistItemId },
        transaction,
      })
      if (existing) await existing.update(values, { transaction })
      else await InspectionResult.create({ inspectionId: inspection.id, checklistItemId: entry.checklistItemId, ...values }, { transaction })
    }
  })
  return loadDetail(id, user)
}

// ─── Submitting (F01.8, F01.10) ───────────────────────────────────────────────

// Everything happens in ONE transaction: if validation fails, or createFromInspection throws,
// nothing changes and the inspection stays a draft.
async function submit(user, id) {
  await sequelize.transaction(async (transaction) => {
    const inspection = await loadOwnDraft(id, user, { transaction, lock: transaction.LOCK.UPDATE })
    const items = await activeItems({ transaction })
    const results = await InspectionResult.findAll({ where: { inspectionId: inspection.id }, transaction })
    const byItem = new Map(results.map((r) => [r.checklistItemId, r]))

    const unanswered = []
    const incompleteDefects = []
    for (const item of items) {
      const r = byItem.get(item.id)
      if (!r || (r.result !== 'pass' && r.result !== 'defect')) unanswered.push(item.id)
      else if (r.result === 'defect' && (isBlank(r.defectDescription) || isBlank(r.severity))) incompleteDefects.push(item.id)
    }
    if (unanswered.length || incompleteDefects.length) {
      const parts = []
      if (unanswered.length) parts.push(`${unanswered.length} ${unanswered.length === 1 ? 'item is' : 'items are'} not answered`)
      if (incompleteDefects.length) parts.push(`${incompleteDefects.length} ${incompleteDefects.length === 1 ? 'defect needs' : 'defects need'} a description and severity`)
      const err = appError(422, 'VALIDATION_ERROR', parts.join(' · '))
      err.details = { unanswered, incompleteDefects }
      throw err
    }

    // Inspector comes from the existing draft (the login), the time from the server clock
    await inspection.update({ status: 'submitted', submittedAt: new Date() }, { transaction })
    await defectService.createFromInspection(inspection.id, { transaction })
  })
  return loadDetail(id, user)
}

// ─── History (F01.11) ─────────────────────────────────────────────────────────

// Submitted inspections are visible to inspector and admin; drafts only to their own inspector.
function listWhere(user, { liftId, from, to, status, inspectionId } = {}) {
  const and = []
  if (inspectionId) and.push({ id: inspectionId })
  if (liftId) and.push({ liftId })

  const ownDrafts = user.role === 'inspector' ? { status: 'draft', inspectorId: user.sub } : null
  if (status === 'draft') and.push(ownDrafts || { id: null })
  else if (status === 'submitted') and.push({ status: 'submitted' })
  else and.push(ownDrafts ? { [Op.or]: [{ status: 'submitted' }, ownDrafts] } : { status: 'submitted' })

  // Date filters use the submit time, or the start time for a draft (it has no submit time yet)
  const dateField = status === 'draft' ? 'createdAt' : 'submittedAt'
  if (from) and.push({ [dateField]: { [Op.gte]: startOfDay(from) } })
  if (to) and.push({ [dateField]: { [Op.lte]: endOfDay(to) } })
  return { [Op.and]: and }
}

async function answerCounts(ids) {
  if (!ids.length) return new Map()
  const rows = await InspectionResult.findAll({
    where: { inspectionId: { [Op.in]: ids }, result: { [Op.in]: ['pass', 'defect'] } },
    attributes: ['inspectionId', 'result', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
    group: ['inspectionId', 'result'],
    raw: true,
  })
  const counts = new Map(ids.map((id) => [id, { pass: 0, defect: 0 }]))
  for (const r of rows) counts.get(r.inspectionId)[r.result] = Number(r.n)
  return counts
}

async function listInspections(user, filters = {}) {
  const rows = await Inspection.findAll({
    where: listWhere(user, filters),
    include: [
      { model: Lift, as: 'lift', include: [{ model: Contractor, as: 'contractor', attributes: ['id', 'name'] }] },
      { model: User, as: 'inspector', attributes: ['id', 'name'] },
    ],
    order: [[sequelize.literal('COALESCE("Inspection"."submitted_at", "Inspection"."created_at")'), 'DESC'], ['id', 'DESC']],
  })
  const totalItems = (await activeItems()).length
  const counts = await answerCounts(rows.map((r) => r.id))

  let list = rows.map((row) => {
    const r = plain(row)
    const c = counts.get(r.id) || { pass: 0, defect: 0 }
    return {
      id: r.id,
      displayId: inspectionDisplayId(r.id),
      status: r.status,
      liftId: r.liftId,
      liftCode: r.lift?.liftCode ?? null,
      address: r.lift ? addressOf(r.lift) : null,
      contractorName: r.lift?.contractor?.name ?? null,
      inspectorName: r.inspector?.name ?? null,
      createdAt: r.createdAt,
      submittedAt: r.submittedAt,
      totalItems,
      answeredCount: c.pass + c.defect,
      passCount: c.pass,
      defectCount: c.defect,
    }
  })
  if (filters.result === 'defect') list = list.filter((i) => i.defectCount > 0)
  if (filters.result === 'pass') list = list.filter((i) => i.defectCount === 0)
  return list
}

// ─── CSV export (F05.3) ───────────────────────────────────────────────────────

const CSV_COLUMNS = [
  'inspection_id', 'lift_code', 'address', 'contractor', 'inspector', 'submitted_at',
  'item_code', 'item_text', 'section', 'result', 'severity', 'description', 'location', 'defect_id',
]

// Quotes a cell when it has a comma, quote or line break. A cell that starts with = + - @ is
// prefixed with an apostrophe so a spreadsheet never runs typed text as a formula.
function csvCell(value) {
  if (value === null || value === undefined) return ''
  let text = value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(rows) {
  const lines = [CSV_COLUMNS.join(',')]
  for (const row of rows) lines.push(CSV_COLUMNS.map((col) => csvCell(row[col])).join(','))
  return `${lines.join('\r\n')}\r\n`
}

// One row per checklist answer, for the submitted inspections the filters match.
async function exportCsv(user, filters = {}) {
  const inspections = await listInspections(user, { ...filters, status: 'submitted' })
  const ids = inspections.map((i) => i.id)
  const rows = []
  if (ids.length) {
    const results = await InspectionResult.findAll({
      where: { inspectionId: { [Op.in]: ids } },
      include: [
        { model: ChecklistItem, as: 'item' },
        { model: Defect, as: 'defect', attributes: ['id'], required: false },
      ],
    })
    const byInspection = new Map(ids.map((id) => [id, []]))
    for (const r of results) byInspection.get(r.inspectionId)?.push(r)

    for (const insp of inspections) {
      const answers = (byInspection.get(insp.id) || [])
        .filter((r) => r.result)
        .sort((a, b) => (a.item?.sortOrder ?? 0) - (b.item?.sortOrder ?? 0))
      for (const r of answers) {
        rows.push({
          inspection_id: insp.displayId,
          lift_code: insp.liftCode,
          address: insp.address,
          contractor: insp.contractorName,
          inspector: insp.inspectorName,
          submitted_at: insp.submittedAt,
          item_code: r.item?.code,
          item_text: r.item?.description,
          section: r.item?.section,
          result: r.result,
          severity: r.severity,
          description: r.defectDescription,
          location: r.defectLocation,
          defect_id: r.defect ? defectDisplayId(r.defect.id) : '',
        })
      }
    }
  }
  return { csv: toCsv(rows), count: inspections.length }
}

module.exports = {
  inspectionDisplayId,
  defectDisplayId,
  csvCell,
  toCsv,
  CSV_COLUMNS,
  getChecklist,
  createOrGetDraft,
  getInspection: loadDetail,
  saveResults,
  submit,
  listInspections,
  exportCsv,
}
