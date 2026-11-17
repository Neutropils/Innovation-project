// Route-level tests for the inspection API: role guards, validation and response shapes.
// The service is mocked, so these never touch a database or Si Qi's defectService.
jest.mock('../../src/services/inspectionService', () => ({
  getChecklist: jest.fn(),
  createOrGetDraft: jest.fn(),
  getInspection: jest.fn(),
  saveResults: jest.fn(),
  submit: jest.fn(),
  listInspections: jest.fn(),
  exportCsv: jest.fn(),
}))

const request = require('supertest')
const jwt = require('jsonwebtoken')

process.env.DEV_JWT_SECRET = process.env.DEV_JWT_SECRET || 'test-secret'
const app = require('../../src')
const inspectionService = require('../../src/services/inspectionService')
const { appError } = require('../../src/utils')

function tokenFor(role, sub = 10) {
  return jwt.sign({ sub, name: 'Test', email: 't@example.com', role, contractorId: role === 'contractor' ? 2 : null }, process.env.DEV_JWT_SECRET)
}
const as = (role, sub) => ({ Authorization: `Bearer ${tokenFor(role, sub)}` })

afterEach(() => jest.clearAllMocks())

// [method, path, body, roles that must be refused]
const ROUTES = [
  ['get', '/api/checklist-items', undefined, ['contractor', 'member']],
  ['get', '/api/inspections', undefined, ['contractor', 'member']],
  ['get', '/api/inspections/export', undefined, ['contractor', 'member']],
  ['get', '/api/inspections/7', undefined, ['contractor', 'member']],
  ['post', '/api/inspections', { liftId: 1 }, ['admin', 'contractor', 'member']],
  ['put', '/api/inspections/7/results', { results: [{ checklistItemId: 1, result: 'pass' }] }, ['admin', 'contractor', 'member']],
  ['post', '/api/inspections/7/submit', {}, ['admin', 'contractor', 'member']],
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

describe('GET /api/checklist-items', () => {
  it('returns the sections with the severity due-date preview as meta', async () => {
    inspectionService.getChecklist.mockResolvedValue({
      sections: [{ section: 'Motor room', items: [{ id: 1, code: 'MR-01' }] }],
      meta: { total: 1, severityDueDays: { critical: 1, major: 7, minor: 14 } },
    })
    const res = await request(app).get('/api/checklist-items').set(as('inspector'))
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data[0].section).toBe('Motor room')
    expect(res.body.meta.severityDueDays).toEqual({ critical: 1, major: 7, minor: 14 })
  })

  it('is readable by an admin', async () => {
    inspectionService.getChecklist.mockResolvedValue({ sections: [], meta: { total: 0 } })
    const res = await request(app).get('/api/checklist-items').set(as('admin'))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/inspections', () => {
  it('returns 201 for a new draft and takes the inspector from the login, not the body', async () => {
    inspectionService.createOrGetDraft.mockResolvedValue({ created: true, inspection: { id: 7, status: 'draft' } })
    const res = await request(app).post('/api/inspections').set(as('inspector', 42)).send({ liftId: 3, inspectorId: 999 })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe(7)
    expect(inspectionService.createOrGetDraft).toHaveBeenCalledWith(expect.objectContaining({ sub: 42, role: 'inspector' }), 3)
  })

  it('returns 200 with the existing draft instead of creating a second one', async () => {
    inspectionService.createOrGetDraft.mockResolvedValue({ created: false, inspection: { id: 7, status: 'draft' } })
    const res = await request(app).post('/api/inspections').set(as('inspector')).send({ liftId: 3 })
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(7)
  })

  it.each([[{}], [{ liftId: 'abc' }], [{ liftId: -1 }]])('rejects %j with 422', async (body) => {
    const res = await request(app).post('/api/inspections').set(as('inspector')).send(body)
    expect(res.status).toBe(422)
    expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_ERROR' })
    expect(inspectionService.createOrGetDraft).not.toHaveBeenCalled()
  })

  it('passes an unknown lift (404) through', async () => {
    inspectionService.createOrGetDraft.mockRejectedValue(appError(404, 'NOT_FOUND', 'Lift not found'))
    const res = await request(app).post('/api/inspections').set(as('inspector')).send({ liftId: 99 })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })
})

describe('GET /api/inspections', () => {
  it('passes the filters to the service', async () => {
    inspectionService.listInspections.mockResolvedValue([])
    const res = await request(app).get('/api/inspections?liftId=3&from=2026-11-01&to=2026-11-30&status=submitted&result=defect').set(as('admin', 3))
    expect(res.status).toBe(200)
    expect(inspectionService.listInspections).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 3, role: 'admin' }),
      { liftId: 3, from: '2026-11-01', to: '2026-11-30', status: 'submitted', result: 'defect' },
    )
  })

  it('treats empty filter values as not set', async () => {
    inspectionService.listInspections.mockResolvedValue([])
    await request(app).get('/api/inspections?liftId=&from=&to=&status=&result=').set(as('inspector'))
    expect(inspectionService.listInspections.mock.calls[0][1]).toEqual({})
  })

  it('rejects a malformed date with 422', async () => {
    const res = await request(app).get('/api/inspections?from=12-11-2026').set(as('inspector'))
    expect(res.status).toBe(422)
  })
})

describe('GET /api/inspections/export', () => {
  it('sends a CSV download named inspections-YYYYMMDD.csv', async () => {
    inspectionService.exportCsv.mockResolvedValue({ csv: 'inspection_id,lift_code\r\nINS-000007,LIFT-0427\r\n', count: 1 })
    const res = await request(app).get('/api/inspections/export?liftId=3').set(as('inspector'))
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/^text\/csv/)
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="inspections-\d{8}\.csv"$/)
    expect(res.text).toContain('INS-000007,LIFT-0427')
    expect(inspectionService.exportCsv).toHaveBeenCalledWith(expect.objectContaining({ role: 'inspector' }), { liftId: 3 })
  })

  it('is not swallowed by the /:id route', async () => {
    inspectionService.exportCsv.mockResolvedValue({ csv: 'a\r\n', count: 0 })
    await request(app).get('/api/inspections/export').set(as('admin'))
    expect(inspectionService.getInspection).not.toHaveBeenCalled()
  })
})

describe('GET /api/inspections/:id', () => {
  it('returns the inspection for the caller', async () => {
    inspectionService.getInspection.mockResolvedValue({ id: 7, displayId: 'INS-000007' })
    const res = await request(app).get('/api/inspections/7').set(as('inspector', 42))
    expect(res.status).toBe(200)
    expect(res.body.data.displayId).toBe('INS-000007')
    expect(inspectionService.getInspection).toHaveBeenCalledWith(7, expect.objectContaining({ sub: 42 }))
  })

  it('passes a hidden draft (404) through', async () => {
    inspectionService.getInspection.mockRejectedValue(appError(404, 'NOT_FOUND', 'Inspection not found'))
    const res = await request(app).get('/api/inspections/7').set(as('admin'))
    expect(res.status).toBe(404)
  })

  it('answers 404 for an id that is not a number', async () => {
    const res = await request(app).get('/api/inspections/abc').set(as('inspector'))
    expect(res.status).toBe(404)
    expect(inspectionService.getInspection).not.toHaveBeenCalled()
  })
})

describe('PUT /api/inspections/:id/results', () => {
  const payload = { results: [{ checklistItemId: 1, result: 'defect', description: 'Door sticks', severity: 'major', extra: 'ignored' }] }

  it('saves the answers and strips unknown fields', async () => {
    inspectionService.saveResults.mockResolvedValue({ id: 7 })
    const res = await request(app).put('/api/inspections/7/results').set(as('inspector', 42)).send(payload)
    expect(res.status).toBe(200)
    const [user, id, results] = inspectionService.saveResults.mock.calls[0]
    expect(user.sub).toBe(42)
    expect(id).toBe(7)
    expect(results[0]).toMatchObject({ checklistItemId: 1, result: 'defect', description: 'Door sticks', severity: 'major' })
    expect(results[0]).not.toHaveProperty('extra')
  })

  it('allows a partial answer (an item with no result yet)', async () => {
    inspectionService.saveResults.mockResolvedValue({ id: 7 })
    const res = await request(app).put('/api/inspections/7/results').set(as('inspector')).send({ results: [{ checklistItemId: 2 }] })
    expect(res.status).toBe(200)
  })

  it.each([
    [{}],
    [{ results: [] }],
    [{ results: [{ result: 'pass' }] }],
    [{ results: [{ checklistItemId: 1, result: 'maybe' }] }],
    [{ results: [{ checklistItemId: 1, result: 'defect', severity: 'huge' }] }],
  ])('rejects %j with 422', async (body) => {
    const res = await request(app).put('/api/inspections/7/results').set(as('inspector')).send(body)
    expect(res.status).toBe(422)
    expect(inspectionService.saveResults).not.toHaveBeenCalled()
  })

  it('answers 409 once the inspection is submitted', async () => {
    inspectionService.saveResults.mockRejectedValue(appError(409, 'ALREADY_SUBMITTED', 'This inspection has already been submitted'))
    const res = await request(app).put('/api/inspections/7/results').set(as('inspector')).send(payload)
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('ALREADY_SUBMITTED')
  })
})

describe('POST /api/inspections/:id/submit', () => {
  it('returns the submitted inspection', async () => {
    inspectionService.submit.mockResolvedValue({ id: 7, status: 'submitted', defects: [{ id: 1 }] })
    const res = await request(app).post('/api/inspections/7/submit').set(as('inspector', 42))
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('submitted')
    expect(inspectionService.submit).toHaveBeenCalledWith(expect.objectContaining({ sub: 42 }), 7)
  })

  it('names the unanswered items and incomplete defects in a 422', async () => {
    const err = appError(422, 'VALIDATION_ERROR', '3 items are not answered · 1 defect needs a description and severity')
    err.details = { unanswered: [1, 2, 3], incompleteDefects: [9] }
    inspectionService.submit.mockRejectedValue(err)
    const res = await request(app).post('/api/inspections/7/submit').set(as('inspector'))
    expect(res.status).toBe(422)
    expect(res.body).toMatchObject({ success: false, code: 'VALIDATION_ERROR', unanswered: [1, 2, 3], incompleteDefects: [9] })
  })

  it('answers 409 on a second submit', async () => {
    inspectionService.submit.mockRejectedValue(appError(409, 'ALREADY_SUBMITTED', 'Already submitted'))
    const res = await request(app).post('/api/inspections/7/submit').set(as('inspector'))
    expect(res.status).toBe(409)
  })

  it('hides unexpected errors behind a 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    inspectionService.submit.mockRejectedValue(new Error('connection refused at 10.0.0.5'))
    const res = await request(app).post('/api/inspections/7/submit').set(as('inspector'))
    expect(res.status).toBe(500)
    expect(res.body.message).not.toContain('10.0.0.5')
    console.error.mockRestore()
  })
})
