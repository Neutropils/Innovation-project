const { DataTypes } = require('sequelize')
const sequelize = require('../config')

// Owner: Jerald - a stored photo (F01.7, F03.6). Belongs to a checklist answer
// (inspector's photo) or a progress update (contractor's evidence). Two nullable
// foreign keys instead of a polymorphic owner_type/owner_id pair, so the database
// can enforce both links.
const Attachment = sequelize.define('Attachment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  inspectionResultId: { type: DataTypes.INTEGER, allowNull: true },
  defectUpdateId: { type: DataTypes.INTEGER, allowNull: true },
  uploadedBy: { type: DataTypes.INTEGER, allowNull: false },
  url: { type: DataTypes.STRING(500), allowNull: false },
  mimeType: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'attachments',
  underscored: true,
})

module.exports = { Attachment }
