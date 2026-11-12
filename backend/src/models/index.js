// ─── Model registry ───────────────────────────────────────────────────────────
// All models are imported here. Associations are declared BELOW the imports so
// every model class exists before any foreign-key reference is made.
//
// Every table in design/er-diagram.md is already registered below (skeleton PR),
// so you should not need to edit this file. If you add a column, change your own
// model file and add a migration. If you need a NEW table or association, tell the
// team first - this file is a merge-conflict hotspot.

// Shared / group
const { User, ROLES } = require('./User')

// Kwan - lift and contractor records, audit log
const { Contractor } = require('./Contractor')
const { Lift } = require('./Lift')
const { DefectEvent } = require('./DefectEvent')

// Kandha - inspections
const { ChecklistItem } = require('./ChecklistItem')
const { Inspection, INSPECTION_STATUSES } = require('./Inspection')
const { InspectionResult, RESULTS } = require('./InspectionResult')

// Si Qi - defects
const { Defect, DEFECT_STATUSES, SEVERITIES } = require('./Defect')

// Jerald - rectification and sign-off
const { DefectUpdate } = require('./DefectUpdate')
const { Attachment } = require('./Attachment')
const { Signoff, SIGNOFF_DECISIONS } = require('./Signoff')


// ─── Associations ─────────────────────────────────────────────────────────────
//
// Convention used here:
//   belongsTo  = "this model holds the foreign key column"
//   hasMany    = "the other model holds the foreign key column pointing here"
//   hasOne     = like hasMany but enforces one child per parent
//
// The `as` names are what you pass to `include`, e.g.
//   Defect.findAll({ include: [{ model: Lift, as: 'lift' }] })

// ── Contractor ───────────────────────────────────────────────────────────────
Contractor.hasMany(Lift,   { foreignKey: 'contractorId', as: 'lifts' })
Contractor.hasMany(User,   { foreignKey: 'contractorId', as: 'users' })
Contractor.hasMany(Defect, { foreignKey: 'contractorId', as: 'defects' })
Lift.belongsTo(Contractor,   { foreignKey: 'contractorId', as: 'contractor' })
User.belongsTo(Contractor,   { foreignKey: 'contractorId', as: 'contractor' })
Defect.belongsTo(Contractor, { foreignKey: 'contractorId', as: 'contractor' })

// ── Lift ─────────────────────────────────────────────────────────────────────
Lift.hasMany(Inspection, { foreignKey: 'liftId', as: 'inspections' })
Lift.hasMany(Defect,     { foreignKey: 'liftId', as: 'defects' })
Inspection.belongsTo(Lift, { foreignKey: 'liftId', as: 'lift' })
Defect.belongsTo(Lift,     { foreignKey: 'liftId', as: 'lift' })

// ── Inspection ───────────────────────────────────────────────────────────────
User.hasMany(Inspection, { foreignKey: 'inspectorId', as: 'inspections' })
Inspection.belongsTo(User, { foreignKey: 'inspectorId', as: 'inspector' })
Inspection.hasMany(InspectionResult, { foreignKey: 'inspectionId', as: 'results' })
InspectionResult.belongsTo(Inspection, { foreignKey: 'inspectionId', as: 'inspection' })
ChecklistItem.hasMany(InspectionResult, { foreignKey: 'checklistItemId', as: 'results' })
InspectionResult.belongsTo(ChecklistItem, { foreignKey: 'checklistItemId', as: 'item' })

// ── Defect ───────────────────────────────────────────────────────────────────
Inspection.hasMany(Defect, { foreignKey: 'inspectionId', as: 'defects' })
Defect.belongsTo(Inspection, { foreignKey: 'inspectionId', as: 'inspection' })
InspectionResult.hasOne(Defect, { foreignKey: 'inspectionResultId', as: 'defect' })
Defect.belongsTo(InspectionResult, { foreignKey: 'inspectionResultId', as: 'result' })

// ── Rectification and sign-off ───────────────────────────────────────────────
Defect.hasMany(DefectUpdate, { foreignKey: 'defectId', as: 'updates' })
DefectUpdate.belongsTo(Defect, { foreignKey: 'defectId', as: 'defect' })
DefectUpdate.belongsTo(User,   { foreignKey: 'userId', as: 'author' })

Defect.hasMany(Signoff, { foreignKey: 'defectId', as: 'signoffs' })
Signoff.belongsTo(Defect, { foreignKey: 'defectId', as: 'defect' })
Signoff.belongsTo(User,   { foreignKey: 'signedBy', as: 'signer' })
Signoff.belongsTo(User,   { foreignKey: 'verifiedBy', as: 'verifier' })

// ── Photos ───────────────────────────────────────────────────────────────────
InspectionResult.hasMany(Attachment, { foreignKey: 'inspectionResultId', as: 'photos' })
DefectUpdate.hasMany(Attachment,     { foreignKey: 'defectUpdateId', as: 'evidence' })
Attachment.belongsTo(InspectionResult, { foreignKey: 'inspectionResultId', as: 'inspectionResult' })
Attachment.belongsTo(DefectUpdate,     { foreignKey: 'defectUpdateId', as: 'defectUpdate' })
Attachment.belongsTo(User,             { foreignKey: 'uploadedBy', as: 'uploader' })

// ── History ──────────────────────────────────────────────────────────────────
Defect.hasMany(DefectEvent, { foreignKey: 'defectId', as: 'events' })
DefectEvent.belongsTo(Defect, { foreignKey: 'defectId', as: 'defect' })
DefectEvent.belongsTo(User,   { foreignKey: 'actorId', as: 'actor' })


// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  // Shared / group
  User,
  ROLES,
  // Kwan
  Contractor,
  Lift,
  DefectEvent,
  // Kandha
  ChecklistItem,
  Inspection,
  InspectionResult,
  INSPECTION_STATUSES,
  RESULTS,
  // Si Qi
  Defect,
  DEFECT_STATUSES,
  SEVERITIES,
  // Jerald
  DefectUpdate,
  Attachment,
  Signoff,
  SIGNOFF_DECISIONS,
}
