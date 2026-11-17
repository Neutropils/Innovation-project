const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Kandha - one spot-check of one lift (F01.8-F01.11)
const INSPECTION_STATUSES = ['draft', 'submitted']

const Inspection = sequelize.define('Inspection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  liftId: { type: DataTypes.INTEGER, allowNull: false },
  inspectorId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM(...INSPECTION_STATUSES), allowNull: false, defaultValue: 'draft' },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'inspections',
  underscored: true,
  indexes: [
    // One open draft per inspector per lift (migration 20261118000000). Submitted inspections are not covered.
    { name: 'inspections_one_open_draft_per_inspector_lift', unique: true, fields: ['inspector_id', 'lift_id'], where: { status: 'draft' } },
  ],
})

module.exports = { Inspection, INSPECTION_STATUSES }
