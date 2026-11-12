const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Kwan - append-only history of every defect change (F02.10, F03.10, F07.3).
// Written only through auditService.logEvent(). actorId is null for system actions.
const DefectEvent = sequelize.define('DefectEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  defectId: { type: DataTypes.INTEGER, allowNull: false },
  actorId: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING(50), allowNull: false },
  fromStatus: { type: DataTypes.STRING(30), allowNull: true },
  toStatus: { type: DataTypes.STRING(30), allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'defect_events',
  underscored: true,
  updatedAt: false,   // events are never edited
})

module.exports = { DefectEvent }
