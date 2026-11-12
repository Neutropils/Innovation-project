'use strict'

// Skeleton PR: every table in design/er-diagram.md, created in one transaction so a
// failure leaves the database unchanged. Owners change their own tables later with
// new migrations - never by editing this file once it has been applied.
//
// Table owners: contractors, lifts, defect_events, users.contractor_id - Kwan
//               checklist_items, inspections, inspection_results    - Kandha
//               defects                                             - Si Qi
//               defect_updates, attachments, signoffs               - Jerald

const TABLES_IN_DROP_ORDER = [
  'defect_events', 'signoffs', 'attachments', 'defect_updates', 'defects',
  'inspection_results', 'inspections', 'checklist_items', 'lifts',
]

const ENUM_TYPES = [
  'enum_inspections_status',
  'enum_inspection_results_result',
  'enum_inspection_results_severity',
  'enum_defects_severity',
  'enum_defects_status',
  'enum_signoffs_decision',
]

module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, DATE, DATEONLY, ENUM } = Sequelize

    const id = { type: INTEGER, primaryKey: true, autoIncrement: true, allowNull: false }
    const timestamps = {
      created_at: { type: DATE, allowNull: false },
      updated_at: { type: DATE, allowNull: false },
    }
    // Foreign key column. onDelete: RESTRICT stops deleting a parent that still has
    // children (e.g. a lift with inspections); CASCADE removes children with the parent.
    const fk = (table, { allowNull = false, onDelete = 'RESTRICT', unique = false } = {}) => ({
      type: INTEGER,
      allowNull,
      unique,
      references: { model: table, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete,
    })

    await queryInterface.sequelize.transaction(async (transaction) => {
      const create = (table, columns) => queryInterface.createTable(table, columns, { transaction })
      const index = (table, columns) => queryInterface.addIndex(table, columns, { transaction })

      // ── Kwan ────────────────────────────────────────────────────────────────
      await create('contractors', {
        id,
        name: { type: STRING(150), allowNull: false, unique: true },
        contact_name: { type: STRING(100), allowNull: true },
        contact_email: { type: STRING(255), allowNull: true },
        contact_phone: { type: STRING(30), allowNull: true },
        contract_start: { type: DATEONLY, allowNull: true },
        contract_end: { type: DATEONLY, allowNull: true },
        is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
      })

      await queryInterface.addColumn('users', 'contractor_id',
        fk('contractors', { allowNull: true, onDelete: 'SET NULL' }), { transaction })

      await create('lifts', {
        id,
        lift_code: { type: STRING(30), allowNull: false, unique: true },
        block: { type: STRING(20), allowNull: false },
        street: { type: STRING(150), allowNull: false },
        town: { type: STRING(60), allowNull: true },
        postal_code: { type: STRING(10), allowNull: true },
        contractor_id: fk('contractors'),
        is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
      })
      await index('lifts', ['contractor_id'])

      // ── Kandha ──────────────────────────────────────────────────────────────
      await create('checklist_items', {
        id,
        section: { type: STRING(60), allowNull: false },
        code: { type: STRING(20), allowNull: false, unique: true },
        description: { type: STRING(255), allowNull: false },
        sort_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
        is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps,
      })

      await create('inspections', {
        id,
        lift_id: fk('lifts'),
        inspector_id: fk('users'),
        status: { type: ENUM('draft', 'submitted'), allowNull: false, defaultValue: 'draft' },
        remarks: { type: TEXT, allowNull: true },
        submitted_at: { type: DATE, allowNull: true },
        ...timestamps,
      })
      await index('inspections', ['lift_id'])
      await index('inspections', ['inspector_id'])

      await create('inspection_results', {
        id,
        inspection_id: fk('inspections', { onDelete: 'CASCADE' }),
        checklist_item_id: fk('checklist_items'),
        result: { type: ENUM('pass', 'defect', 'na'), allowNull: true },
        note: { type: TEXT, allowNull: true },
        defect_description: { type: TEXT, allowNull: true },
        defect_location: { type: STRING(150), allowNull: true },
        severity: { type: ENUM('critical', 'major', 'minor'), allowNull: true },
        ...timestamps,
      })
      // One answer per checklist item per inspection
      await queryInterface.addConstraint('inspection_results', {
        fields: ['inspection_id', 'checklist_item_id'],
        type: 'unique',
        name: 'inspection_results_inspection_item_unique',
        transaction,
      })

      // ── Si Qi ───────────────────────────────────────────────────────────────
      await create('defects', {
        id,
        inspection_id: fk('inspections'),
        inspection_result_id: fk('inspection_results', { unique: true }),   // one defect per failed item
        lift_id: fk('lifts'),
        contractor_id: fk('contractors'),
        description: { type: TEXT, allowNull: false },
        location: { type: STRING(150), allowNull: true },
        severity: { type: ENUM('critical', 'major', 'minor'), allowNull: false },
        status: {
          type: ENUM('open', 'acknowledged', 'in_progress', 'pending_verification', 'closed'),
          allowNull: false,
          defaultValue: 'open',
        },
        due_date: { type: DATEONLY, allowNull: false },
        closed_at: { type: DATE, allowNull: true },
        ...timestamps,
      })
      await index('defects', ['contractor_id', 'status'])
      await index('defects', ['lift_id'])
      await index('defects', ['due_date'])

      // ── Jerald ──────────────────────────────────────────────────────────────
      await create('defect_updates', {
        id,
        defect_id: fk('defects', { onDelete: 'CASCADE' }),
        user_id: fk('users'),
        note: { type: TEXT, allowNull: false },
        ...timestamps,
      })
      await index('defect_updates', ['defect_id'])

      await create('attachments', {
        id,
        inspection_result_id: fk('inspection_results', { allowNull: true, onDelete: 'CASCADE' }),
        defect_update_id: fk('defect_updates', { allowNull: true, onDelete: 'CASCADE' }),
        uploaded_by: fk('users'),
        url: { type: STRING(500), allowNull: false },
        mime_type: { type: STRING(100), allowNull: true },
        ...timestamps,
      })

      await create('signoffs', {
        id,
        defect_id: fk('defects', { onDelete: 'CASCADE' }),
        signed_by: fk('users'),
        signed_at: { type: DATE, allowNull: false },
        confirmation_text: { type: STRING(255), allowNull: false },
        verified_by: fk('users', { allowNull: true }),
        verified_at: { type: DATE, allowNull: true },
        decision: { type: ENUM('approved', 'rejected'), allowNull: true },
        reason: { type: TEXT, allowNull: true },
        ...timestamps,
      })
      await index('signoffs', ['defect_id'])

      // ── Kwan: history (written only through auditService.logEvent) ─────────
      await create('defect_events', {
        id,
        defect_id: fk('defects', { onDelete: 'CASCADE' }),
        actor_id: fk('users', { allowNull: true }),   // null = system action
        action: { type: STRING(50), allowNull: false },
        from_status: { type: STRING(30), allowNull: true },
        to_status: { type: STRING(30), allowNull: true },
        note: { type: TEXT, allowNull: true },
        created_at: { type: DATE, allowNull: false },
      })
      await index('defect_events', ['defect_id'])
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of TABLES_IN_DROP_ORDER) {
        await queryInterface.dropTable(table, { transaction })
      }
      await queryInterface.removeColumn('users', 'contractor_id', { transaction })
      await queryInterface.dropTable('contractors', { transaction })
      for (const type of ENUM_TYPES) {
        await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}";`, { transaction })
      }
    })
  },
}
