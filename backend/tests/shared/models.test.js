// The skeleton registers every table in design/er-diagram.md. Defining models does not
// open a database connection, so this runs in CI without DATABASE_URL.
const models = require('../../src/models')
const { CHECKLIST, DEMO_DEFECTS, LIFTS, CONTRACTORS } = require('../../src/seed')

const TABLES = {
  User: 'users',
  Contractor: 'contractors',
  Lift: 'lifts',
  ChecklistItem: 'checklist_items',
  Inspection: 'inspections',
  InspectionResult: 'inspection_results',
  Defect: 'defects',
  DefectUpdate: 'defect_updates',
  Attachment: 'attachments',
  Signoff: 'signoffs',
  DefectEvent: 'defect_events',
}

describe('model registry', () => {
  it.each(Object.entries(TABLES))('%s maps to the %s table with snake_case columns', (name, table) => {
    expect(models[name].getTableName()).toBe(table)
    expect(models[name].options.underscored).toBe(true)
  })

  it('links a defect to everything the screens need', () => {
    expect(Object.keys(models.Defect.associations).sort()).toEqual(
      ['contractor', 'events', 'inspection', 'lift', 'result', 'signoffs', 'updates']
    )
  })

  it('links a contractor user to their company', () => {
    expect(models.User.associations.contractor.target).toBe(models.Contractor)
    expect(models.User.rawAttributes.contractorId.field).toBe('contractor_id')
  })

  it('exports the agreed status values', () => {
    expect(models.DEFECT_STATUSES).toEqual(['open', 'acknowledged', 'in_progress', 'pending_verification', 'closed'])
    expect(models.SEVERITIES).toEqual(['critical', 'major', 'minor'])
  })
})

describe('seed data', () => {
  it('has 25 checklist items in 3 sections with unique codes', () => {
    expect(CHECKLIST).toHaveLength(25)
    expect(new Set(CHECKLIST.map(([section]) => section)).size).toBe(3)
    expect(new Set(CHECKLIST.map(([, code]) => code)).size).toBe(25)
  })

  it('gives every lift a valid contractor and a unique code', () => {
    expect(new Set(LIFTS.map(([code]) => code)).size).toBe(LIFTS.length)
    LIFTS.forEach(([, , , , , ci]) => expect(CONTRACTORS[ci]).toBeDefined())
  })

  it('has a demo defect in every status', () => {
    const statuses = new Set(DEMO_DEFECTS.map(([, , , status]) => status))
    expect([...statuses].sort()).toEqual([...models.DEFECT_STATUSES].sort())
  })

  it('only fails checklist items that exist', () => {
    const codes = new Set(CHECKLIST.map(([, code]) => code))
    DEMO_DEFECTS.forEach(([, code]) => expect(codes.has(code)).toBe(true))
  })
})
