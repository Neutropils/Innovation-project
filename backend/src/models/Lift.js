const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Kwan - the lift register (F04.1). Every lift has exactly one responsible contractor.
const Lift = sequelize.define('Lift', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  liftCode: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  block: { type: DataTypes.STRING(20), allowNull: false },
  street: { type: DataTypes.STRING(150), allowNull: false },
  town: { type: DataTypes.STRING(60), allowNull: true },
  postalCode: { type: DataTypes.STRING(10), allowNull: true },
  contractorId: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'lifts',
  underscored: true,
})

module.exports = { Lift }
