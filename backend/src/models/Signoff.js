const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Jerald - a contractor's sign-off and the inspector's decision on it (F03.7-F03.10).
// A rejected sign-off stays as history; the contractor's next sign-off is a new row.
const SIGNOFF_DECISIONS = ['approved', 'rejected']

const Signoff = sequelize.define('Signoff', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  defectId: { type: DataTypes.INTEGER, allowNull: false },
  signedBy: { type: DataTypes.INTEGER, allowNull: false },
  signedAt: { type: DataTypes.DATE, allowNull: false },
  confirmationText: { type: DataTypes.STRING(255), allowNull: false },
  verifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  verifiedAt: { type: DataTypes.DATE, allowNull: true },
  decision: { type: DataTypes.ENUM(...SIGNOFF_DECISIONS), allowNull: true },
  reason: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'signoffs',
  underscored: true,
})

module.exports = { Signoff, SIGNOFF_DECISIONS }
