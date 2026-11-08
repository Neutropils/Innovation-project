const request = require('supertest')
const bcrypt = require('bcryptjs')

// Mock the User model so these tests run in CI without a database.
// End-to-end checks against a real database are done with npm run db:migrate + db:create-user.
jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn() },
  ROLES: ['admin', 'inspector', 'contractor', 'member'],
}))
const { User } = require('../../src/models')
const app = require('../../src')

process.env.DEV_JWT_SECRET = process.env.DEV_JWT_SECRET || 'test-secret'

function fakeUser(overrides = {}) {
  return {
    id: 7,
    name: 'Ivy Inspector',
    email: 'inspector@example.com',
    role: 'inspector',
    isActive: true,
    password: bcrypt.hashSync('correct-horse', 4),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

afterEach(() => jest.clearAllMocks())

describe('POST /api/auth/login', () => {
  it('returns a token whose claims carry the user role', async () => {
    const user = fakeUser()
    User.findOne.mockResolvedValue(user)
    const res = await request(app).post('/api/auth/login').send({ email: 'inspector@example.com', password: 'correct-horse' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toEqual({ id: 7, name: 'Ivy Inspector', email: 'inspector@example.com', role: 'inspector' })
    const claims = JSON.parse(Buffer.from(res.body.data.token.split('.')[1], 'base64url').toString())
    expect(claims).toMatchObject({ sub: 7, role: 'inspector' })
    expect(user.update).toHaveBeenCalledWith({ lastLoginAt: expect.any(Date) })
  })

  it('matches the email case-insensitively', async () => {
    User.findOne.mockResolvedValue(fakeUser())
    await request(app).post('/api/auth/login').send({ email: 'Inspector@Example.COM', password: 'correct-horse' })
    expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'inspector@example.com' } })
  })

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    User.findOne.mockResolvedValue(fakeUser())
    const res = await request(app).post('/api/auth/login').send({ email: 'inspector@example.com', password: 'nope-nope' })
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ success: false, code: 'INVALID_CREDENTIALS' })
  })

  it('gives the same 401 for an unknown email', async () => {
    User.findOne.mockResolvedValue(null)
    const res = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'whatever1' })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('INVALID_CREDENTIALS')
  })

  it('blocks deactivated accounts with 403 ACCOUNT_DISABLED', async () => {
    User.findOne.mockResolvedValue(fakeUser({ isActive: false }))
    const res = await request(app).post('/api/auth/login').send({ email: 'inspector@example.com', password: 'correct-horse' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_DISABLED')
  })

  it('returns 422 VALIDATION_ERROR for a missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'inspector@example.com' })
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('VALIDATION_ERROR')
    expect(User.findOne).not.toHaveBeenCalled()
  })
})
