// ─── Model registry ───────────────────────────────────────────────────────────
// All models are imported here. Associations are declared BELOW the imports so
// every model class exists before any foreign-key reference is made.
// To add a new model: (1) create its file, (2) require it here, (3) add its associations.

const { User, ROLES } = require('./User')

// <Teammate name> - <feature area>
// const Project = require('./Project')


// ─── Associations ─────────────────────────────────────────────────────────────
//
// Convention used here:
//   belongsTo  = "this model holds the foreign key column"
//   hasMany    = "the other model holds the foreign key column pointing here"
//   hasOne     = like hasMany but enforces one child per parent
//
// All associations are in one file so you can see every relationship in a single
// place rather than hunting across individual model files.

// ── User ─────────────────────────────────────────────────────────────────────
// User.hasMany(Project, { foreignKey: 'owner_id', as: 'projects' })


// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  // Shared / group
  User,
  ROLES,
}
