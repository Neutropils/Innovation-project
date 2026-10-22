const { DataTypes } = require('sequelize')
const sequelize = require('../config')

const ROLES = ['admin', 'member']

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
}, {
  tableName: 'users',
  underscored: true,
})

module.exports = { User, ROLES }
