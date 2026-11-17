// Logic tests for inspectionService with the database and Si Qi's defectService mocked.
const mockTx = { LOCK: { UPDATE: 'UPDATE' }, id: 'tx-1' }

jest.mock('../../src/config', () => ({
  transaction: jest.fn((fn) => fn(mockTx)),
  fn: jest.fn((name, col) => ({ fn: name, col })),
  col: jest.fn((name) => ({ col: name })),
  literal: jest.fn((sql) => ({ literal: sql })),
}))
jest.mock('../../src/models', () => ({
  Inspection: { findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  InspectionResult: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  ChecklistItem: { findAll: jest.fn() },
  Lift: { findByPk: jest.fn() },
  Contractor: {},
  User: {},
  Defect: {},
  Attachment: {},
}))
jest.mock('../../src/services/defectService', () => ({
  SEVERITY_DUE_DAYS: { critical: 1, major: 7, minor: 14 },
  createFromInspection: jest.fn(),
}))

const { Op } = require('sequelize')
const sequelize = require('../../src/config')
const { Inspection, InspectionResult, ChecklistItem, Lift } = require('../../src/models')
const defectService = require('../../src/services/defectService')
const service = require('../../src/services/inspectionService')

const inspector = { sub: 10, role: 'inspector', contractorId: null }
const otherInspector = { sub: 11, role: 'inspector', contractorId: null }
const admin = { sub: 3, role: 'admin', contractorId: null }

const ITEMS = [
  { id: 1, code: 'MR-01', section: 'Motor room', description: 'Machine runs quietly', sortOrder: 1 },
  { id: 2, code: 'MR-02', section: 'Motor room', description: 'Brake works', sortOrder: 2 },
  { id: 3, code: 'LC-01', section: 'Lift car', description: 'Doors close smoothly', sortOrder: 3 },
]

function inspectionRow(overrides = {}) {
  const row = {
    id: 7,
    liftId: 3,
    inspectorId: 10,
    status: 'draft',
    createdAt: new Date('2026-11-12T10:00:00Z'),
    submittedAt: null,
    lift: { id: 3, liftCode: 'LIFT-0427', block: '512', street: 'Hougang Avenue 10', town: 'Hougang', contractor: { id: 1, name: 'Apex Lift Engineering' } },
    inspector: { id: 10, name: 'Ivy Tan' },
    results: [],
    defects: [],
    ...overrides,
  }
  row.update = jest.fn(async (values) => { Object.assign(row, values) })
  return row
}

const answer = (checklistItemId, result, extra = {}) => ({ id: 100 + checklistItemId, inspectionId: 7, checklistItemId, result, defectDescription: null, defectLocation: null, severity: null, ...extra })

beforeEach(() => {
  ChecklistItem.findAll.mockResolvedValue(ITEMS)
  InspectionResult.findAll.mockResolvedValue([])
  InspectionResult.create.mockResolvedValue({})
  defectService.createFromInspection.mockResolvedValue([])
})
afterEach(() => jest.resetAllMocks())

// Re-arm the mocks that every test relies on (resetAllMocks clears implementations)
beforeEach(() => {
  sequelize.transaction.mockImplementation((fn) => fn(mockTx))
  sequelize.fn.mockImplementation((name, col) => ({ fn: name, col }))
  sequelize.col.mockImplementation((name) => ({ col: name }))
  sequelize.literal.mockImplementation((sql) => ({ literal: sql }))
})

describe('getChecklist (F01.3)', () => {
  it('groups active items by section in checklist order and previews due dates', async () => {
    const { sections, meta } = await service.getChecklist()
    expect(sections.map((s) => s.section)).toEqual(['Motor room', 'Lift car'])
    expect(sections[0].items.map((i) => i.code)).toEqual(['MR-01', 'MR-02'])
    expect(meta).toEqual({ total: 3, severityDueDays: { critical: 1, major: 7, minor: 14 } })
    expect(ChecklistItem.findAll.mock.calls[0][0].where).toEqual({ isActive: true })
  })
})

describe('createOrGetDraft', () => {
  it('returns the existing draft instead of creating a second one', async () => {
    Lift.findByPk.mockResolvedValue({ id: 3, isActive: true })
    Inspection.findOne.mockResolvedValue({ id: 7 })
    Inspection.findByPk.mockResolvedValue(inspectionRow())
    const out = await service.createOrGetDraft(inspector, 3)
    expect(out.created).toBe(false)
    expect(out.inspection.displayId).toBe('INS-000007')
    expect(Inspection.create).not.toHaveBeenCalled()
    expect(Inspection.findOne.mock.calls[0][0].where).toEqual({ liftId: 3, inspectorId: 10, status: 'draft' })
  })

  it('creates a draft owned by the logged-in inspector', async () => {
    Lift.findByPk.mockResolvedValue({ id: 3, isActive: true })
    Inspection.findOne.mockResolvedValue(null)
    Inspection.create.mockResolvedValue({ id: 8 })
    Inspection.findByPk.mockResolvedValue(inspectionRow({ id: 8 }))
    const out = await service.createOrGetDraft(inspector, 3)
    expect(out.created).toBe(true)
    expect(Inspection.create).toHaveBeenCalledWith({ liftId: 3, inspectorId: 10, status: 'draft' })
  })

  it.each([[null], [{ id: 3, isActive: false }]])('answers 404 for a missing or deactivated lift (%j)', async (lift) => {
    Lift.findByPk.mockResolvedValue(lift)
    await expect(service.createOrGetDraft(inspector, 3)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(Inspection.create).not.toHaveBeenCalled()
  })
})

describe('getInspection', () => {
  it('lists every active item with its answer, counts and the defects raised', async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow({
      status: 'submitted',
      submittedAt: new Date('2026-11-12T11:00:00Z'),
      results: [answer(1, 'pass'), answer(2, 'defect', { defectDescription: 'Brake squeals', defectLocation: 'Motor room', severity: 'major' })],
      defects: [{ id: 5, inspectionResultId: 102, description: 'Brake squeals', location: 'Motor room', severity: 'major', status: 'open', dueDate: '2026-11-19' }],
    }))
    const detail = await service.getInspection(7, admin)
    expect(detail.counts).toEqual({ total: 3, answered: 2, pass: 1, defect: 1 })
    expect(detail.results.map((r) => [r.code, r.result])).toEqual([['MR-01', 'pass'], ['MR-02', 'defect'], ['LC-01', null]])
    expect(detail.defects[0]).toMatchObject({ displayId: 'DEF-000005', itemCode: 'MR-02', status: 'open' })
    expect(detail.lift.address).toBe('Blk 512, Hougang Avenue 10, Hougang')
    expect(detail.contractor.name).toBe('Apex Lift Engineering')
  })

  it("hides a draft from everyone but its inspector (admin included)", async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow())
    await expect(service.getInspection(7, otherInspector)).rejects.toMatchObject({ status: 404 })
    await expect(service.getInspection(7, admin)).rejects.toMatchObject({ status: 404 })
    await expect(service.getInspection(7, inspector)).resolves.toMatchObject({ status: 'draft' })
  })

  it('lets any inspector or admin read a submitted inspection', async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow({ status: 'submitted' }))
    await expect(service.getInspection(7, otherInspector)).resolves.toMatchObject({ status: 'submitted' })
    await expect(service.getInspection(7, admin)).resolves.toMatchObject({ status: 'submitted' })
  })

  it('answers 404 when the inspection does not exist', async () => {
    Inspection.findByPk.mockResolvedValue(null)
    await expect(service.getInspection(99, inspector)).rejects.toMatchObject({ status: 404 })
  })
})

describe('saveResults (F01.4, F01.6, F01.9)', () => {
  beforeEach(() => Inspection.findByPk.mockResolvedValue(inspectionRow()))

  it('creates a row for a new answer and updates the row for an existing one', async () => {
    const existing = { update: jest.fn() }
    InspectionResult.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing)
    await service.saveResults(inspector, 7, [
      { checklistItemId: 1, result: 'pass' },
      { checklistItemId: 2, result: 'pass' },
    ])
    expect(InspectionResult.create).toHaveBeenCalledWith(expect.objectContaining({ inspectionId: 7, checklistItemId: 1, result: 'pass' }), { transaction: mockTx })
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ result: 'pass' }), { transaction: mockTx })
  })

  it('accepts a partial save (one answer, rest still blank)', async () => {
    InspectionResult.findOne.mockResolvedValue(null)
    await expect(service.saveResults(inspector, 7, [{ checklistItemId: 3, result: null }])).resolves.toBeDefined()
    expect(InspectionResult.create).toHaveBeenCalledTimes(1)
  })

  it('maps description and location onto the defect_* columns createFromInspection reads', async () => {
    InspectionResult.findOne.mockResolvedValue(null)
    await service.saveResults(inspector, 7, [{ checklistItemId: 2, result: 'defect', description: 'Brake squeals', location: 'By the drum', severity: 'major' }])
    expect(InspectionResult.create).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'defect', defectDescription: 'Brake squeals', defectLocation: 'By the drum', severity: 'major' }),
      expect.anything(),
    )
  })

  it("defaults a defect's location to its section name", async () => {
    InspectionResult.findOne.mockResolvedValue(null)
    await service.saveResults(inspector, 7, [{ checklistItemId: 3, result: 'defect', description: 'Sticks', location: '  ', severity: 'minor' }])
    expect(InspectionResult.create.mock.calls[0][0].defectLocation).toBe('Lift car')
  })

  it('clears defect details when an item is switched back to Pass', async () => {
    const existing = { update: jest.fn() }
    InspectionResult.findOne.mockResolvedValue(existing)
    await service.saveResults(inspector, 7, [{ checklistItemId: 2, result: 'pass', description: 'old text', severity: 'major', location: 'x' }])
    expect(existing.update).toHaveBeenCalledWith({ result: 'pass', defectDescription: null, defectLocation: null, severity: null }, { transaction: mockTx })
  })

  it('rejects an item that is not on the active checklist', async () => {
    await expect(service.saveResults(inspector, 7, [{ checklistItemId: 999, result: 'pass' }])).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' })
    expect(InspectionResult.create).not.toHaveBeenCalled()
  })

  it("hides another inspector's draft (404)", async () => {
    await expect(service.saveResults(otherInspector, 7, [{ checklistItemId: 1, result: 'pass' }])).rejects.toMatchObject({ status: 404 })
    expect(InspectionResult.create).not.toHaveBeenCalled()
  })

  it('answers 409 once the inspection is submitted', async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow({ status: 'submitted' }))
    await expect(service.saveResults(inspector, 7, [{ checklistItemId: 1, result: 'pass' }])).rejects.toMatchObject({ status: 409, code: 'ALREADY_SUBMITTED' })
  })

  it("refuses (403) to change someone else's submitted inspection", async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow({ status: 'submitted' }))
    await expect(service.saveResults(otherInspector, 7, [{ checklistItemId: 1, result: 'pass' }])).rejects.toMatchObject({ status: 403 })
  })
})

describe('submit (F01.8, F01.10)', () => {
  const allAnswered = [answer(1, 'pass'), answer(2, 'pass'), answer(3, 'pass')]

  it('names the unanswered items and the incomplete defects, and changes nothing', async () => {
    const row = inspectionRow()
    Inspection.findByPk.mockResolvedValue(row)
    InspectionResult.findAll.mockResolvedValue([answer(1, 'defect', { defectDescription: 'Noisy', severity: null })])
    await expect(service.submit(inspector, 7)).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: '2 items are not answered · 1 defect needs a description and severity',
      details: { unanswered: [2, 3], incompleteDefects: [1] },
    })
    expect(row.update).not.toHaveBeenCalled()
    expect(defectService.createFromInspection).not.toHaveBeenCalled()
  })

  it('treats a Defect with a blank description as incomplete', async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow())
    InspectionResult.findAll.mockResolvedValue([answer(1, 'pass'), answer(2, 'pass'), answer(3, 'defect', { defectDescription: '   ', severity: 'minor' })])
    await expect(service.submit(inspector, 7)).rejects.toMatchObject({ details: { unanswered: [], incompleteDefects: [3] } })
  })

  it('submits with the inspector and time already on the draft, then calls createFromInspection once with the transaction', async () => {
    const row = inspectionRow()
    Inspection.findByPk.mockResolvedValue(row)
    InspectionResult.findAll.mockResolvedValue(allAnswered)
    const before = Date.now()
    const out = await service.submit(inspector, 7)

    expect(row.update).toHaveBeenCalledWith({ status: 'submitted', submittedAt: expect.any(Date) }, { transaction: mockTx })
    expect(row.update.mock.calls[0][0].submittedAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(row.inspectorId).toBe(10)
    expect(defectService.createFromInspection).toHaveBeenCalledTimes(1)
    expect(defectService.createFromInspection).toHaveBeenCalledWith(7, { transaction: mockTx })
    expect(out.status).toBe('submitted')
  })

  it('rolls back: when createFromInspection throws the error propagates out of the transaction', async () => {
    const row = inspectionRow()
    Inspection.findByPk.mockResolvedValue(row)
    InspectionResult.findAll.mockResolvedValue(allAnswered)
    defectService.createFromInspection.mockRejectedValue(new Error('defect insert failed'))

    await expect(service.submit(inspector, 7)).rejects.toThrow('defect insert failed')
    // The status change and the defects share ONE transaction, so the database undoes both
    expect(sequelize.transaction).toHaveBeenCalledTimes(1)
    expect(row.update.mock.calls[0][1].transaction).toBe(mockTx)
    expect(defectService.createFromInspection.mock.calls[0][1].transaction).toBe(mockTx)
  })

  it('answers 409 on a second submit and creates no more defects', async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow({ status: 'submitted' }))
    await expect(service.submit(inspector, 7)).rejects.toMatchObject({ status: 409, code: 'ALREADY_SUBMITTED' })
    expect(defectService.createFromInspection).not.toHaveBeenCalled()
  })

  it("hides another inspector's draft (404)", async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow())
    await expect(service.submit(otherInspector, 7)).rejects.toMatchObject({ status: 404 })
  })

  it('locks the row so two submits at once cannot both succeed', async () => {
    Inspection.findByPk.mockResolvedValue(inspectionRow())
    InspectionResult.findAll.mockResolvedValue(allAnswered)
    await service.submit(inspector, 7)
    expect(Inspection.findByPk.mock.calls[0][1]).toMatchObject({ transaction: mockTx, lock: 'UPDATE' })
  })
})

describe('listInspections (F01.11)', () => {
  const rows = (...list) => list.map((r) => inspectionRow(r))
  const whereOf = () => Inspection.findAll.mock.calls[0][0].where[Op.and]

  beforeEach(() => InspectionResult.findAll.mockResolvedValue([]))

  it("shows an admin submitted inspections only - never drafts", async () => {
    Inspection.findAll.mockResolvedValue([])
    await service.listInspections(admin, {})
    expect(whereOf()).toEqual([{ status: 'submitted' }])
  })

  it("shows an inspector all submitted inspections plus their own drafts", async () => {
    Inspection.findAll.mockResolvedValue([])
    await service.listInspections(inspector, {})
    expect(whereOf()).toEqual([{ [Op.or]: [{ status: 'submitted' }, { status: 'draft', inspectorId: 10 }] }])
  })

  it("returns no drafts at all when an admin asks for status=draft", async () => {
    Inspection.findAll.mockResolvedValue([])
    await service.listInspections(admin, { status: 'draft' })
    expect(whereOf()).toEqual([{ id: null }])
  })

  it('filters by lift and date range (inclusive of the whole last day)', async () => {
    Inspection.findAll.mockResolvedValue([])
    await service.listInspections(inspector, { liftId: 3, from: '2026-11-01', to: '2026-11-30', status: 'submitted' })
    const and = whereOf()
    expect(and).toContainEqual({ liftId: 3 })
    expect(and).toContainEqual({ status: 'submitted' })
    const gte = and.find((c) => c.submittedAt?.[Op.gte]).submittedAt[Op.gte]
    const lte = and.find((c) => c.submittedAt?.[Op.lte]).submittedAt[Op.lte]
    expect(gte.getHours()).toBe(0)
    expect(lte.getDate()).toBe(30)
    expect(lte.getHours()).toBe(23)
  })

  it('returns lift, contractor, inspector, answered count and defect count per row', async () => {
    Inspection.findAll.mockResolvedValue(rows({ id: 7, status: 'submitted', submittedAt: new Date('2026-11-12T11:00:00Z') }))
    InspectionResult.findAll.mockResolvedValue([{ inspectionId: 7, result: 'pass', n: '2' }, { inspectionId: 7, result: 'defect', n: '1' }])
    const [row] = await service.listInspections(inspector, {})
    expect(row).toMatchObject({
      displayId: 'INS-000007', liftCode: 'LIFT-0427', address: 'Blk 512, Hougang Avenue 10, Hougang',
      contractorName: 'Apex Lift Engineering', inspectorName: 'Ivy Tan', totalItems: 3, answeredCount: 3, defectCount: 1,
    })
  })

  it('filters by result: with defects / all pass', async () => {
    Inspection.findAll.mockResolvedValue(rows({ id: 7, status: 'submitted' }, { id: 8, status: 'submitted' }))
    InspectionResult.findAll.mockResolvedValue([{ inspectionId: 7, result: 'defect', n: '1' }, { inspectionId: 8, result: 'pass', n: '3' }])
    expect((await service.listInspections(inspector, { result: 'defect' })).map((i) => i.id)).toEqual([7])
    expect((await service.listInspections(inspector, { result: 'pass' })).map((i) => i.id)).toEqual([8])
  })
})

describe('CSV export (F05.3)', () => {
  it('escapes commas, quotes and line breaks', () => {
    expect(service.csvCell('plain')).toBe('plain')
    expect(service.csvCell('a, b')).toBe('"a, b"')
    expect(service.csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(service.csvCell('line1\nline2')).toBe('"line1\nline2"')
    expect(service.csvCell(null)).toBe('')
    expect(service.csvCell(undefined)).toBe('')
  })

  it('stops a typed value from running as a spreadsheet formula', () => {
    expect(service.csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`)
    expect(service.csvCell('+1')).toBe("'+1")
    expect(service.csvCell('@cmd')).toBe("'@cmd")
  })

  it('writes the header row and one row per checklist answer', async () => {
    Inspection.findAll.mockResolvedValue([inspectionRow({ id: 7, status: 'submitted', submittedAt: new Date('2026-11-12T11:00:00Z') })])
    InspectionResult.findAll
      .mockResolvedValueOnce([{ inspectionId: 7, result: 'pass', n: '1' }, { inspectionId: 7, result: 'defect', n: '1' }]) // counts
      .mockResolvedValueOnce([
        { inspectionId: 7, result: 'defect', severity: 'major', defectDescription: 'Brake, squeals "loudly"', defectLocation: 'Motor room', item: ITEMS[1], defect: { id: 5 } },
        { inspectionId: 7, result: 'pass', severity: null, defectDescription: null, defectLocation: null, item: ITEMS[0], defect: null },
      ])
    const { csv, count } = await service.exportCsv(inspector, { liftId: 3 })
    const lines = csv.trimEnd().split('\r\n')

    expect(count).toBe(1)
    expect(lines[0]).toBe('inspection_id,lift_code,address,contractor,inspector,submitted_at,item_code,item_text,section,result,severity,description,location,defect_id')
    expect(lines).toHaveLength(3)
    // Rows are in checklist order, not the order the database returned them
    expect(lines[1]).toContain('INS-000007,LIFT-0427,"Blk 512, Hougang Avenue 10, Hougang",Apex Lift Engineering,Ivy Tan,2026-11-12T11:00:00.000Z,MR-01')
    expect(lines[1].endsWith(',pass,,,,')).toBe(true)
    expect(lines[2]).toContain('MR-02,Brake works,Motor room,defect,major,"Brake, squeals ""loudly""",Motor room,DEF-000005')
  })

  it('exports submitted inspections only, whatever status is asked for', async () => {
    Inspection.findAll.mockResolvedValue([])
    const { csv } = await service.exportCsv(inspector, { status: 'draft' })
    expect(Inspection.findAll.mock.calls[0][0].where[Op.and]).toEqual([{ status: 'submitted' }])
    expect(csv.trimEnd().split('\r\n')).toHaveLength(1) // header only
  })
})
