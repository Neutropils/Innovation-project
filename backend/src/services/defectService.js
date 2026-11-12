// Owner: Si Qi - defect creation, status rules, due dates (F02)
//
// CONTRACT (agreed in the skeleton PR - don't change signatures without telling the team):
//
//   createFromInspection(inspectionId, { transaction })
//     Called by Kandha's submit. Creates one 'open' defect per 'defect' answer, assigned to
//     the lift's contractor, with a due date from its severity. Safe to call twice: an answer
//     that already has a defect is skipped. Returns the created defects.
//
//   transition(defectId, toStatus, user, { note, reason, transaction })
//     The ONLY way to change defects.status. `user` is req.user ({ sub, role, contractorId }).
//     Throws appError 404 / 409 INVALID_TRANSITION / 403 FORBIDDEN / 422 VALIDATION_ERROR.
//     Writes a defect_events row. Returns the updated defect.
//     It does NOT check sign-off evidence - Jerald's signoffService does that before calling it.
//
//   isOverdue(defect, today)  -  true when past due and not closed. A flag, not a status.
//
// Built in the skeleton so everyone can code against real behaviour from day 1.
// Still Si Qi's to finish: confirm due-date rules with EMS, reassignment (F02.4), filters,
// history, exports and overview.
const { Defect, Inspection, InspectionResult, Lift } = require('../models')
const { logEvent } = require('./auditService')
const { appError } = require('../utils')

// Days until due, by severity. PLACEHOLDERS - confirm with EMS (open question in
// design/feature-dependencies.md). Changing them here changes them everywhere.
const SEVERITY_DUE_DAYS = { critical: 1, major: 7, minor: 14 }

// Every allowed status move - mirrors the table in design/workflow-diagram.md.
const TRANSITIONS = [
  { from: 'open',                 to: 'acknowledged',         roles: ['contractor'] },
  { from: 'acknowledged',         to: 'in_progress',          roles: ['contractor'] },
  { from: 'in_progress',          to: 'pending_verification', roles: ['contractor'] },
  { from: 'pending_verification', to: 'closed',               roles: ['inspector', 'admin'] },
  { from: 'pending_verification', to: 'in_progress',          roles: ['inspector', 'admin'], requiresReason: true },
]

function findTransition(from, to) {
  return TRANSITIONS.find((t) => t.from === from && t.to === to) || null
}

// 'YYYY-MM-DD' that is SEVERITY_DUE_DAYS[severity] days after `from` (calendar days, UTC).
function dueDateFor(severity, from = new Date()) {
  const days = SEVERITY_DUE_DAYS[severity]
  if (days === undefined) throw appError(422, 'VALIDATION_ERROR', `Unknown severity: ${severity}`)
  const due = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + days))
  return due.toISOString().slice(0, 10)
}

function isOverdue(defect, today = new Date()) {
  if (!defect || defect.status === 'closed') return false
  return defect.dueDate < today.toISOString().slice(0, 10)
}

async function createFromInspection(inspectionId, { transaction } = {}) {
  const inspection = await Inspection.findByPk(inspectionId, {
    include: [
      { model: Lift, as: 'lift' },
      { model: InspectionResult, as: 'results', where: { result: 'defect' }, required: false },
    ],
    transaction,
  })
  if (!inspection) throw appError(404, 'NOT_FOUND', `Inspection ${inspectionId} not found`)

  const createdDefects = []
  for (const result of inspection.results) {
    if (!result.severity) {
      throw appError(422, 'VALIDATION_ERROR', `Checklist answer ${result.id} is a defect but has no severity`)
    }
    const existing = await Defect.findOne({ where: { inspectionResultId: result.id }, transaction })
    if (existing) continue

    const defect = await Defect.create({
      inspectionId: inspection.id,
      inspectionResultId: result.id,
      liftId: inspection.liftId,
      contractorId: inspection.lift.contractorId,
      description: result.defectDescription || 'Defect found during spot-check',
      location: result.defectLocation,
      severity: result.severity,
      status: 'open',
      dueDate: dueDateFor(result.severity),
    }, { transaction })

    await logEvent({
      defectId: defect.id,
      actorId: inspection.inspectorId,
      action: 'created',
      toStatus: 'open',
    }, { transaction })
    createdDefects.push(defect)
  }
  return createdDefects
}

async function transition(defectId, toStatus, user, { note = null, reason = null, transaction } = {}) {
  const defect = await Defect.findByPk(defectId, { transaction })
  if (!defect) throw appError(404, 'NOT_FOUND', `Defect ${defectId} not found`)

  const fromStatus = defect.status
  const rule = findTransition(fromStatus, toStatus)
  if (!rule) {
    throw appError(409, 'INVALID_TRANSITION', `A defect cannot move from ${fromStatus} to ${toStatus}`)
  }
  if (!rule.roles.includes(user.role)) {
    throw appError(403, 'FORBIDDEN', `A ${user.role} cannot move a defect from ${fromStatus} to ${toStatus}`)
  }
  if (user.role === 'contractor' && user.contractorId !== defect.contractorId) {
    throw appError(403, 'FORBIDDEN', 'This defect is assigned to another contractor')
  }
  if (rule.requiresReason && !(reason && reason.trim())) {
    throw appError(422, 'VALIDATION_ERROR', 'A reason is required to reject a repair')
  }

  // Only update if the status is still what we read, so two people acting at once
  // can't both succeed (e.g. approve and reject the same repair).
  const changes = { status: toStatus, closedAt: toStatus === 'closed' ? new Date() : null }
  const [count] = await Defect.update(changes, { where: { id: defect.id, status: fromStatus }, transaction })
  if (count === 0) {
    throw appError(409, 'INVALID_TRANSITION', 'This defect was changed by someone else - reload and try again')
  }

  await logEvent({
    defectId: defect.id,
    actorId: user.sub,
    action: 'status_change',
    fromStatus,
    toStatus,
    note: reason || note,
  }, { transaction })

  return defect.reload({ transaction })
}

module.exports = {
  SEVERITY_DUE_DAYS,
  TRANSITIONS,
  findTransition,
  dueDateFor,
  isOverdue,
  createFromInspection,
  transition,
}
