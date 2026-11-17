'use strict'

// Owner: Kandha - one open draft per inspector per lift.
//
// Adds a partial unique index on inspections (inspector_id, lift_id) WHERE status = 'draft'.
// It is the database-level guard behind inspectionService.createOrGetDraft(): even if two
// requests (or two server processes) try to start a draft for the same inspector and lift at
// the same moment, only one insert succeeds and the other reopens that draft.
//
// No column changes. Submitted inspections are not covered by the index, so an inspector can
// still run any number of spot-checks on the same lift over time.
//
// Before creating the index this checks for existing duplicate drafts and stops with a clear
// message instead of deleting anything - duplicates cannot exist before the inspection API was
// built, but if they do, an inspector should decide which draft to keep.
const INDEX = 'inspections_one_open_draft_per_inspector_lift'

module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql)
    const [duplicates] = await q(
      `SELECT inspector_id, lift_id, COUNT(*) AS drafts FROM inspections
       WHERE status = 'draft' GROUP BY inspector_id, lift_id HAVING COUNT(*) > 1`
    )
    if (duplicates.length > 0) {
      const list = duplicates.map((d) => `inspector ${d.inspector_id} / lift ${d.lift_id} (${d.drafts} drafts)`).join('; ')
      throw new Error(`Cannot add the unique draft index: duplicate open drafts exist - ${list}. Submit or delete the extras first.`)
    }
    await q(`CREATE UNIQUE INDEX ${INDEX} ON inspections (inspector_id, lift_id) WHERE status = 'draft'`)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${INDEX}`)
  },
}
