// Route-level tests for defect detail, history and reassign: role guards, validation and
// response shapes. defectService is mocked, so these never touch the database.
jest.mock('../../src/services/defectService', () => ({
  getDefect: jest.fn(),
  getHistory: jest.fn(),
  reassign: jest.fn(),
}))

const request = require('supertest')
const jwt = require('jsonwebtoken')

process.env.DEV_JWT_SECRET = process.env.DEV_JWT_SECRET || 'test-secret'
const app = require('../../src')
const defectService = require('../../src/services/defectService')
const { appError } = require('../../src/utils')

function tokenFor(role, sub = 10) {
  return jwt.sign({ sub, name: 'Test', email: 't@example.com', role, contractorId: role === 'contractor' ? 2 : null }, process.env.DEV_JWT_SECRET)
}
const as = (role) => ({ Authorization: `Bearer ${tokenFor(role)}` })

afterEach(() => jest.resetAllMocks())

// [method, path, body, roles that must be refused]
const ROUTES = [
  ['get', '/api/defects/88', undefined, ['member']],
  ['get', '/api/defects/88/history', undefined, ['member']],
  ['patch', '/api/defects/88/assign', { contractorId: 3, reason: 'Contract changed' }, ['inspector', 'contractor', 'member']],
]

describe.each(ROUTES)('%s %s', (method, path, body, refused) => {
  it('needs a login', async () => {
    const res = await request(app)[method](path)
    expect(res.status).toBe(401)
  })

  it.each(refused)('refuses a %s', async (role) => {
    const res = await request(app)[method](path).set(as(role)).send(body)
    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ success: false, code: 'FORBIDDEN' })
  })
})

describe('GET /api/defects/:id', () => {
  it.each(['inspector', 'admin', 'contractor'])('returns the defect to a %s', async (role) => {
    defectService.getDefect.mockResolvedValue({ id: 88, code: 'DEF-000088' })
    const res = await request(app).get('/api/defects/88').set(as(role))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { id: 88, code: 'DEF-000088' } })
    expect(defectService.getDefect).toHaveBeenCalledWith(88, expect.objectContaining({ role }))
  })

  it('answers 404 for a non-numeric id without calling the service', async () => {
    const res = await request(app).get('/api/defects/abc').set(as('admin'))
    expect(res.status).toBe(404)
    expect(defectService.getDefect).not.toHaveBeenCalled()
  })

  it('passes a service 404 through', async () => {
    defectService.getDefect.mockRejectedValue(appError(404, 'NOT_FOUND', 'Defect not found'))
    const res = await request(app).get('/api/defects/88').set(as('contractor'))
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ success: false, code: 'NOT_FOUND' })
  })

  it('hides internal errors behind a 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    defectService.getDefect.mockRejectedValue(new Error('connection refused at 10.0.0.1'))
    const res = await request(app).get('/api/defects/88').set(as('admin'))
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' })
  })
})

describe('GET /api/defects/:id/history', () => {
  it('returns the events', async () => {
    const events = [{ id: 1, action: 'created', toStatus: 'open', actor: { id: 10, name: 'Ivy Tan', role: 'inspector' } }]
    defectService.getHistory.mockResolvedValue(events)
    const res = await request(app).get('/api/defects/88/history').set(as('contractor'))
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(events)
    expect(defectService.getHistory).toHaveBeenCalledWith(88, expect.objectContaining({ role: 'contractor', contractorId: 2 }))
  })
})

describe('PATCH /api/defects/:id/assign', () => {
  it('reassigns and returns the updated defect', async () => {
    defectService.reassign.mockResolvedValue({ id: 88, contractorId: 3, contractorName: 'Summit Elevators' })
    const res = await request(app)
      .patch('/api/defects/88/assign')
      .set(as('admin'))
      .send({ contractorId: '3', reason: '  Contract changed  ', status: 'closed' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ contractorId: 3 })
    // String id coerced, reason trimmed, unknown fields (status) stripped
    expect(defectService.reassign).toHaveBeenCalledWith(88, { contractorId: 3, reason: 'Contract changed' }, expect.objectContaining({ role: 'admin' }))
  })

  it.each([
    ['no contractor', { reason: 'Contract changed' }],
    ['a non-numeric contractor', { contractorId: 'abc', reason: 'Contract changed' }],
    ['no reason', { contractorId: 3 }],
    ['a blank reason', { contractorId: 3, reason: '   ' }],
    ['a reason over 500 characters', { contractorId: 3, reason: 'x'.repeat(501) }],
  ])('answers 422 for %s', async (_, body) => {
    const res = await request(app).patch('/api/defects/88/assign').set(as('admin')).send(body)
    expect(res.status).toBe(422)
    expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_ERROR' })
    expect(defectService.reassign).not.toHaveBeenCalled()
  })

  it('passes 409 DEFECT_CLOSED through', async () => {
    defectService.reassign.mockRejectedValue(appError(409, 'DEFECT_CLOSED', 'A closed defect cannot be reassigned'))
    const res = await request(app).patch('/api/defects/88/assign').set(as('admin')).send({ contractorId: 3, reason: 'Contract changed' })
    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ code: 'DEFECT_CLOSED' })
  })
})
