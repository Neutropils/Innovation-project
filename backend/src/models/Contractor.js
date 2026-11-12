const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Kwan - lift companies that maintain lifts and fix defects (F04.2, F04.4)
const Contractor = sequelize.define('Contractor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  contactName: { type: DataTypes.STRING(100), allowNull: true },
  contactEmail: { type: DataTypes.STRING(255), allowNull: true },
  contactPhone: { type: DataTypes.STRING(30), allowNull: true },
  contractStart: { type: DataTypes.DATEONLY, allowNull: true },   // P2 (F04.4)
  contractEnd: { type: DataTypes.DATEONLY, allowNull: true },     // P2 (F04.4)
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'contractors',
  underscored: true,
})

module.exports = { Contractor }
