// Logic tests for defect detail, history and reassignment (F02.2, F02.4, F02.10).
// The database is mocked, and Kwan's auditService is mocked, so no DB is needed.
const mockTx = { LOCK: { UPDATE: 'UPDATE' }, id: 'tx-1' }

jest.mock('../../src/config', () => ({
  transaction: jest.fn((fn) => fn(mockTx)),
}))
jest.mock('../../src/models', () => ({
  Defect: { findByPk: jest.fn() },
  DefectEvent: { findAll: jest.fn() },
  Contractor: { findByPk: jest.fn() },
  Inspection: {},
  InspectionResult: {},
  ChecklistItem: {},
  Lift: {},
  User: {},
}))
jest.mock('../../src/services/auditService', () => ({ logEvent: jest.fn() }))

const sequelize = require('../../src/config')
const { Defect, DefectEvent, Contractor } = require('../../src/models')
const { logEvent } = require('../../src/services/auditService')
const { getDefect, getHistory, reassign } = require('../../src/services/defectService')

const admin = { sub: 1, role: 'admin', contractorId: null }
const inspector = { sub: 10, role: 'inspector', contractorId: null }
const apexContractor = { sub: 30, role: 'contractor', contractorId: 2 }
const otherContractor = { sub: 31, role: 'contractor', contractorId: 9 }

const APEX = { id: 2, name: 'Apex Lifts', isActive: true }
const SUMMIT = { id: 3, name: 'Summit Elevators', isActive: true }
const RETIRED = { id: 4, name: 'Old Lift Co', isActive: false }
const CONTRACTORS = { 2: APEX, 3: SUMMIT, 4: RETIRED }

function fullDefect(overrides = {}) {
  return {
    id: 88,
    inspectionId: 40,
    liftId: 7,
    contractorId: 2,
    description: 'Door sensor not responding',
    location: 'Car door',
    severity: 'major',
    status: 'in_progress',
    dueDate: '2000-01-01',
    createdAt: new Date('1999-12-25T09:00:00Z'),
    closedAt: null,
    lift: { liftCode: 'LIFT-0427', block: '512', street: 'Ang Mo Kio Ave 3' },
    contractor: { name: 'Apex Lifts' },
    result: { item: { description: 'Door safety edge works' } },
    ...overrides,
  }
}

beforeEach(() => {
  sequelize.transaction.mockImplementation((fn) => fn(mockTx))
  Contractor.findByPk.mockImplementation(async (id) => CONTRACTORS[id] ?? null)
})
afterEach(() => jest.resetAllMocks())

describe('getDefect', () => {
  it('returns the defect with its display ID, lift, item, contractor and overdue flag', async () => {
    Defect.findByPk.mockResolvedValue(fullDefect())
    const d = await getDefect(88, inspector)
    expect(d).toMatchObject({
      id: 88,
      code: 'DEF-000088',
      liftCode: 'LIFT-0427',
      liftName: 'Blk 512 Ang Mo Kio Ave 3',
      item: 'Door safety edge works',
      description: 'Door sensor not responding',
      contractorId: 2,
      contractorName: 'Apex Lifts',
      dueDate: '2000-01-01',
      overdue: true,
    })
  })

  it('lets a contractor see their own company\'s defect', async () => {
    Defect.findByPk.mockResolvedValue(fullDefect())
    await expect(getDefect(88, apexContractor)).resolves.toMatchObject({ id: 88 })
  })

  it('hides another company\'s defect from a contractor with 404', async () => {
    Defect.findByPk.mockResolvedValue(fullDefect())
    await expect(getDefect(88, otherContractor)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('returns 404 for a defect that does not exist', async () => {
    Defect.findByPk.mockResolvedValue(null)
    await expect(getDefect(99, admin)).rejects.toMatchObject({ status: 404 })
  })
})

describe('getHistory', () => {
  const events = [
    { id: 1, action: 'created', fromStatus: null, toStatus: 'open', note: null, createdAt: '2026-11-12T01:14:00Z', actor: { id: 10, name: 'Ivy Tan', role: 'inspector', password: 'hash' } },
    { id: 2, action: 'reassigned', fromStatus: null, toStatus: null, note: 'From Apex Lifts to Summit Elevators. Reason: Contract changed', createdAt: '2026-11-13T02:00:00Z', actor: { id: 1, name: 'Aisha Rahman', role: 'admin' } },
    { id: 3, action: 'status_change', fromStatus: 'open', toStatus: 'acknowledged', note: null, createdAt: '2026-11-13T03:00:00Z', actor: null },
  ]

  it('returns every event oldest first, with who did it', async () => {
    Defect.findByPk.mockResolvedValue({ id: 88, contractorId: 2 })
    DefectEvent.findAll.mockResolvedValue(events)

    const history = await getHistory(88, admin)

    expect(DefectEvent.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { defectId: 88 },
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    }))
    expect(history).toHaveLength(3)
    expect(history[0]).toEqual({
      id: 1, action: 'created', fromStatus: null, toStatus: 'open', note: null,
      createdAt: '2026-11-12T01:14:00Z', actor: { id: 10, name: 'Ivy Tan', role: 'inspector' },
    })
    expect(history[1]).toMatchObject({ action: 'reassigned', note: expect.stringContaining('Contract changed') })
  })

  it('never returns more about the actor than id, name and role', async () => {
    Defect.findByPk.mockResolvedValue({ id: 88, contractorId: 2 })
    DefectEvent.findAll.mockResolvedValue(events)
    const [first] = await getHistory(88, admin)
    expect(Object.keys(first.actor)).toEqual(['id', 'name', 'role'])
  })

  it('shows a system action (no actor) as actor null', async () => {
    Defect.findByPk.mockResolvedValue({ id: 88, contractorId: 2 })
    DefectEvent.findAll.mockResolvedValue(events)
    const history = await getHistory(88, admin)
    expect(history[2].actor).toBeNull()
  })

  it('hides another company\'s history from a contractor with 404', async () => {
    Defect.findByPk.mockResolvedValue({ id: 88, contractorId: 2 })
    await expect(getHistory(88, otherContractor)).rejects.toMatchObject({ status: 404 })
    expect(DefectEvent.findAll).not.toHaveBeenCalled()
  })

  it('returns 404 for a defect that does not exist', async () => {
    Defect.findByPk.mockResolvedValue(null)
    await expect(getHistory(99, admin)).rejects.toMatchObject({ status: 404 })
  })
})

describe('reassign', () => {
  // First findByPk is the locked row, the second is getDefect() reading it back
  function lockedDefect(overrides = {}) {
    const row = { id: 88, contractorId: 2, status: 'in_progress', ...overrides }
    row.update = jest.fn(async (changes) => Object.assign(row, changes))
    return row
  }

  it('moves the defect to the new company, keeps its status and logs who and why', async () => {
    const row = lockedDefect()
    Defect.findByPk
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(fullDefect({ contractorId: 3, contractor: { name: 'Summit Elevators' } }))

    const result = await reassign(88, { contractorId: 3, reason: '  Contract changed  ' }, admin)

    expect(Defect.findByPk).toHaveBeenNthCalledWith(1, 88, { transaction: mockTx, lock: 'UPDATE' })
    expect(row.update).toHaveBeenCalledWith({ contractorId: 3 }, { transaction: mockTx })
    expect(row.status).toBe('in_progress')
    expect(logEvent).toHaveBeenCalledWith({
      defectId: 88,
      actorId: 1,
      action: 'reassigned',
      note: 'From Apex Lifts to Summit Elevators. Reason: Contract changed',
    }, { transaction: mockTx })
    expect(result).toMatchObject({ contractorId: 3, contractorName: 'Summit Elevators', status: 'in_progress' })
  })

  it('refuses a closed defect with 409 DEFECT_CLOSED', async () => {
    const row = lockedDefect({ status: 'closed' })
    Defect.findByPk.mockResolvedValueOnce(row)
    await expect(reassign(88, { contractorId: 3, reason: 'Contract changed' }, admin))
      .rejects.toMatchObject({ status: 409, code: 'DEFECT_CLOSED' })
    expect(row.update).not.toHaveBeenCalled()
    expect(logEvent).not.toHaveBeenCalled()
  })

  it('refuses the contractor it already has with 422', async () => {
    Defect.findByPk.mockResolvedValueOnce(lockedDefect())
    await expect(reassign(88, { contractorId: 2, reason: 'Contract changed' }, admin))
      .rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' })
  })

  it.each([
    ['does not exist', 77],
    ['is deactivated', 4],
  ])('refuses a contractor that %s with 422', async (_, contractorId) => {
    const row = lockedDefect()
    Defect.findByPk.mockResolvedValueOnce(row)
    await expect(reassign(88, { contractorId, reason: 'Contract changed' }, admin))
      .rejects.toMatchObject({ status: 422, message: 'Choose an active contractor' })
    expect(row.update).not.toHaveBeenCalled()
  })

  it.each(['', '   ', undefined])('needs a reason (%p)', async (reason) => {
    await expect(reassign(88, { contractorId: 3, reason }, admin))
      .rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' })
    expect(sequelize.transaction).not.toHaveBeenCalled()
  })

  it('returns 404 for a defect that does not exist', async () => {
    Defect.findByPk.mockResolvedValueOnce(null)
    await expect(reassign(99, { contractorId: 3, reason: 'Contract changed' }, admin))
      .rejects.toMatchObject({ status: 404 })
  })
})
