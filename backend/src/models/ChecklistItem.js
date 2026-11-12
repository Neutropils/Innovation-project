const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Kandha - the spot-check checklist (F01.3). Seeded, not edited in the app.
const ChecklistItem = sequelize.define('ChecklistItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  section: { type: DataTypes.STRING(60), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(255), allowNull: false },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'checklist_items',
  underscored: true,
})

module.exports = { ChecklistItem }
