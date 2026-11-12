// Contract tests for defectService (skeleton PR). These pin down the behaviour Kandha and
// Jerald code against, so Si Qi can change the internals without breaking them.
jest.mock('../../src/models', () => ({
  Defect: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
  Inspection: { findByPk: jest.fn() },
  InspectionResult: {},
  Lift: {},
}))
jest.mock('../../src/services/auditService', () => ({ logEvent: jest.fn() }))

const { Defect, Inspection } = require('../../src/models')
const { logEvent } = require('../../src/services/auditService')
const {
  TRANSITIONS, dueDateFor, isOverdue, createFromInspection, transition,
} = require('../../src/services/defectService')

afterEach(() => jest.clearAllMocks())

function fakeDefect(overrides = {}) {
  const defect = { id: 5, status: 'open', contractorId: 2, dueDate: '2026-11-20', ...overrides }
  defect.reload = jest.fn().mockResolvedValue({ ...defect, reloaded: true })
  return defect
}

const contractor = { sub: 30, role: 'contractor', contractorId: 2 }
const otherContractor = { sub: 31, role: 'contractor', contractorId: 9 }
const inspector = { sub: 10, role: 'inspector', contractorId: null }

describe('status rules', () => {
  it('matches the transition table in design/workflow-diagram.md', () => {
    expect(TRANSITIONS.map((t) => `${t.from}->${t.to}`)).toEqual([
      'open->acknowledged',
      'acknowledged->in_progress',
      'in_progress->pending_verification',
      'pending_verification->closed',
      'pending_verification->in_progress',
    ])
  })

  it('never lets a contractor close a defect', () => {
    const contractorMoves = TRANSITIONS.filter((t) => t.roles.includes('contractor'))
    expect(contractorMoves.some((t) => t.to === 'closed')).toBe(false)
  })
})

describe('dueDateFor', () => {
  const nov12 = new Date('2026-11-12T10:00:00Z')

  it.each([
    ['critical', '2026-11-13'],
    ['major', '2026-11-19'],
    ['minor', '2026-11-26'],
  ])('gives a %s defect a due date of %s', (severity, expected) => {
    expect(dueDateFor(severity, nov12)).toBe(expected)
  })

  it('rejects an unknown severity with 422', () => {
    expect(() => dueDateFor('urgent', nov12)).toThrow(expect.objectContaining({ status: 422 }))
  })
})

describe('isOverdue', () => {
  const today = new Date('2026-11-12T08:00:00Z')

  it('flags an unclosed defect past its due date', () => {
    expect(isOverdue({ status: 'in_progress', dueDate: '2026-11-11' }, today)).toBe(true)
  })

  it('does not flag a defect due today', () => {
    expect(isOverdue({ status: 'open', dueDate: '2026-11-12' }, today)).toBe(false)
  })

  it('never flags a closed defect', () => {
    expect(isOverdue({ status: 'closed', dueDate: '2026-01-01' }, today)).toBe(false)
  })
})

describe('transition', () => {
  it('lets the assigned contractor acknowledge and logs the change', async () => {
    Defect.findByPk.mockResolvedValue(fakeDefect())
    Defect.update.mockResolvedValue([1])

    const result = await transition(5, 'acknowledged', contractor)

    expect(Defect.update).toHaveBeenCalledWith(
      { status: 'acknowledged', closedAt: null },
      expect.objectContaining({ where: { id: 5, status: 'open' } })
    )
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ defectId: 5, actorId: 30, action: 'status_change', fromStatus: 'open', toStatus: 'acknowledged' }),
      expect.anything()
    )
    expect(result.reloaded).toBe(true)
  })

  it('refuses a contractor from another company with 403', async () => {
    Defect.findByPk.mockResolvedValue(fakeDefect())
    await expect(transition(5, 'acknowledged', otherContractor)).rejects.toMatchObject({ status: 403 })
    expect(Defect.update).not.toHaveBeenCalled()
  })

  it('refuses a contractor approving their own repair with 403', async () => {
    Defect.findByPk.mockResolvedValue(fakeDefect({ status: 'pending_verification' }))
    await expect(transition(5, 'closed', contractor)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('refuses a move that skips a step with 409', async () => {
    Defect.findByPk.mockResolvedValue(fakeDefect({ status: 'open' }))
    await expect(transition(5, 'closed', inspector)).rejects.toMatchObject({ status: 409, code: 'INVALID_TRANSITION' })
  })

  it('needs a reason to reject a repair', async () => {
    Defect.findByPk.mockResolvedValue(fakeDefect({ status: 'pending_verification' }))
    await expect(transition(5, 'in_progress', inspector, { reason: '  ' })).rejects.toMatchObject({ status: 422 })
  })

  it('records the rejection reason in the history', async () => {
    Defect.findByPk.mockResolvedValue(fakeDefect({ status: 'pending_verification' }))
    Defect.update.mockResolvedValue([1])
    await transition(5, 'in_progress', inspector, { reason: 'Sensor still faulty' })
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ note: 'Sensor still faulty', toStatus: 'in_progress' }), expect.anything())
  })

  it('sets closedAt when an inspector approves', async () => {
    Defect.findByPk.mockResolvedValue(fakeDefect({ status: 'pending_verification' }))
    Defect.update.mockResolvedValue([1])
    await transition(5, 'closed', inspector)
    expect(Defect.update.mock.calls[0][0]).toEqual({ status: 'closed', closedAt: expect.any(Date) })
  })

  it('fails with 409 when someone else changed the defect first', async () => {
    Defect.findByPk.mockResolvedValue(fakeDefect())
    Defect.update.mockResolvedValue([0])
    await expect(transition(5, 'acknowledged', contractor)).rejects.toMatchObject({ status: 409 })
    expect(logEvent).not.toHaveBeenCalled()
  })

  it('returns 404 for a defect that does not exist', async () => {
    Defect.findByPk.mockResolvedValue(null)
    await expect(transition(99, 'acknowledged', contractor)).rejects.toMatchObject({ status: 404 })
  })
})

describe('createFromInspection', () => {
  function fakeInspection(results) {
    return { id: 40, liftId: 7, inspectorId: 10, lift: { contractorId: 2 }, results }
  }

  it('creates one open defect per failed item, assigned to the lift contractor', async () => {
    Inspection.findByPk.mockResolvedValue(fakeInspection([
      { id: 1, severity: 'major', defectDescription: 'Door sensor faulty', defectLocation: 'Car door' },
      { id: 2, severity: 'minor', defectDescription: 'Light flickering', defectLocation: null },
    ]))
    Defect.findOne.mockResolvedValue(null)
    Defect.create.mockImplementation(async (values) => ({ id: values.inspectionResultId + 100, ...values }))

    const created = await createFromInspection(40)

    expect(created).toHaveLength(2)
    expect(Defect.create).toHaveBeenCalledWith(expect.objectContaining({
      inspectionId: 40, inspectionResultId: 1, liftId: 7, contractorId: 2,
      description: 'Door sensor faulty', severity: 'major', status: 'open', dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }), expect.anything())
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ defectId: 101, actorId: 10, action: 'created', toStatus: 'open' }), expect.anything())
  })

  it('skips items that already have a defect, so submitting twice is safe', async () => {
    Inspection.findByPk.mockResolvedValue(fakeInspection([{ id: 1, severity: 'major' }]))
    Defect.findOne.mockResolvedValue({ id: 101 })
    expect(await createFromInspection(40)).toEqual([])
    expect(Defect.create).not.toHaveBeenCalled()
  })

  it('rejects a failed item without a severity with 422', async () => {
    Inspection.findByPk.mockResolvedValue(fakeInspection([{ id: 1, severity: null }]))
    await expect(createFromInspection(40)).rejects.toMatchObject({ status: 422 })
  })

  it('returns 404 for an inspection that does not exist', async () => {
    Inspection.findByPk.mockResolvedValue(null)
    await expect(createFromInspection(404)).rejects.toMatchObject({ status: 404 })
  })
})
