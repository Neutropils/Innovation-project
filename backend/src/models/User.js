const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// admin = EMS administrator, inspector = property officer doing spot-checks,
// contractor = lift company user, member = default for self sign-up
const ROLES = ['admin', 'inspector', 'contractor', 'member']

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  name:     { type: DataTypes.STRING(100), allowNull: false },
  email:    { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role:     { type: DataTypes.ENUM(...ROLES), allowNull: false, defaultValue: 'member' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  // The lift company a contractor account belongs to. Null for every other role.
  contractorId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'users',
  underscored: true,
})

module.exports = { User, ROLES }
