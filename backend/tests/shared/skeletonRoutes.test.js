// Every endpoint in the API contract (design/feature-dependencies.md) is mounted and
// guarded. Placeholders answer 501 until their owner builds them - when you build one,
// move its row out of PLACEHOLDERS and test the real behaviour in tests/<your-name>/.
const request = require('supertest')
const jwt = require('jsonwebtoken')

process.env.DEV_JWT_SECRET = process.env.DEV_JWT_SECRET || 'test-secret'
const app = require('../../src')

function tokenFor(role) {
  return jwt.sign({ sub: 1, name: 'Test', email: 't@example.com', role, contractorId: role === 'contractor' ? 2 : null }, process.env.DEV_JWT_SECRET)
}

// [method, path, an allowed role, a refused role]
const PLACEHOLDERS = [
  // Kwan
  ['get', '/api/lifts', 'inspector', 'contractor'],
  ['post', '/api/lifts/import', 'admin', 'inspector'],
  ['get', '/api/lifts/1', 'inspector', 'contractor'],
  ['post', '/api/lifts', 'admin', 'inspector'],
  ['patch', '/api/lifts/1', 'admin', 'inspector'],
  ['get', '/api/contractors', 'admin', 'contractor'],
  ['get', '/api/contractors/1', 'inspector', 'member'],
  ['post', '/api/contractors', 'admin', 'inspector'],
  ['patch', '/api/contractors/1', 'admin', 'inspector'],
  ['get', '/api/users', 'admin', 'inspector'],
  ['post', '/api/users', 'admin', 'inspector'],
  ['patch', '/api/users/1', 'admin', 'contractor'],
  // Kandha
  ['get', '/api/checklist-items', 'inspector', 'contractor'],
  ['get', '/api/inspections', 'inspector', 'contractor'],
  ['get', '/api/inspections/export', 'admin', 'contractor'],
  ['post', '/api/inspections', 'inspector', 'admin'],
  ['get', '/api/inspections/1', 'inspector', 'member'],
  ['put', '/api/inspections/1/results', 'inspector', 'admin'],
  ['post', '/api/inspections/1/submit', 'inspector', 'contractor'],
  // Si Qi
  ['get', '/api/defects', 'admin', 'contractor'],
  ['get', '/api/defects/export', 'inspector', 'contractor'],
  ['get', '/api/defects/1', 'contractor', 'member'],
  ['get', '/api/defects/1/history', 'inspector', 'member'],
  ['patch', '/api/defects/1/assign', 'admin', 'inspector'],
  ['get', '/api/overview', 'admin', 'inspector'],
  // Jerald
  ['post', '/api/defects/1/acknowledge', 'contractor', 'inspector'],
  ['post', '/api/defects/1/updates', 'contractor', 'admin'],
  ['post', '/api/defects/1/signoff', 'contractor', 'inspector'],
  ['post', '/api/defects/1/verify', 'inspector', 'contractor'],
  ['get', '/api/defects/1/signoffs', 'contractor', 'member'],
  ['get', '/api/inbox', 'contractor', 'inspector'],
  ['post', '/api/attachments', 'contractor', 'admin'],
]

describe.each(PLACEHOLDERS)('%s %s', (method, path, allowed, refused) => {
  it('needs a login', async () => {
    const res = await request(app)[method](path)
    expect(res.status).toBe(401)
  })

  it(`refuses a ${refused}`, async () => {
    const res = await request(app)[method](path).set('Authorization', `Bearer ${tokenFor(refused)}`)
    expect(res.status).toBe(403)
  })

  it(`is mounted for a ${allowed} and not built yet`, async () => {
    const res = await request(app)[method](path).set('Authorization', `Bearer ${tokenFor(allowed)}`)
    expect(res.status).toBe(501)
    expect(res.body).toMatchObject({ success: false, code: 'NOT_IMPLEMENTED' })
  })
})
