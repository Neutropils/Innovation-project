const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Jerald - a contractor's progress note on a defect (F03.5)
const DefectUpdate = sequelize.define('DefectUpdate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  defectId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  note: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'defect_updates',
  underscored: true,
})

module.exports = { DefectUpdate }
