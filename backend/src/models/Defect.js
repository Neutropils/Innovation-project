const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Si Qi - one defect raised from one failed checklist item (F02).
// status is changed ONLY through defectService.transition() - see design/workflow-diagram.md.
const DEFECT_STATUSES = ['open', 'acknowledged', 'in_progress', 'pending_verification', 'closed']
const SEVERITIES = ['critical', 'major', 'minor']

const Defect = sequelize.define('Defect', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  inspectionId: { type: DataTypes.INTEGER, allowNull: false },
  inspectionResultId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  liftId: { type: DataTypes.INTEGER, allowNull: false },
  contractorId: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  location: { type: DataTypes.STRING(150), allowNull: true },
  severity: { type: DataTypes.ENUM(...SEVERITIES), allowNull: false },
  status: { type: DataTypes.ENUM(...DEFECT_STATUSES), allowNull: false, defaultValue: 'open' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  closedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'defects',
  underscored: true,
})

module.exports = { Defect, DEFECT_STATUSES, SEVERITIES }
