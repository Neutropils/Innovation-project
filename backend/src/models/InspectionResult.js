const { DataTypes } = require('sequelize')
const sequelize = require('../config')
const { SEVERITIES } = require('./Defect')

// Owner: Kandha - the answer to one checklist item in one inspection (F01.4-F01.6).
// result is null while the inspection is a draft and the item is unanswered.
// The defect_* columns hold what the inspector typed for a Defect answer; on submit,
// defectService.createFromInspection() copies them into a defects row.
const RESULTS = ['pass', 'defect', 'na']

const InspectionResult = sequelize.define('InspectionResult', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  inspectionId: { type: DataTypes.INTEGER, allowNull: false },
  checklistItemId: { type: DataTypes.INTEGER, allowNull: false },
  result: { type: DataTypes.ENUM(...RESULTS), allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
  defectDescription: { type: DataTypes.TEXT, allowNull: true },
  defectLocation: { type: DataTypes.STRING(150), allowNull: true },
  severity: { type: DataTypes.ENUM(...SEVERITIES), allowNull: true },
}, {
  tableName: 'inspection_results',
  underscored: true,
})

module.exports = { InspectionResult, RESULTS }
