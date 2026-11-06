const bcrypt = require('bcryptjs')

jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn() },
  ROLES: ['admin', 'inspector', 'contractor', 'member'],
}))
const { User } = require('../../src/models')
const { createOrResetUser, generatePassword } = require('../../src/services/userService')

afterEach(() => jest.clearAllMocks())

describe('userService.createOrResetUser', () => {
  it('stores a bcrypt hash, never the plain password', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockImplementation(async (v) => ({ id: 1, isActive: true, ...v }))
    const result = await createOrResetUser({ name: 'Ann Admin', email: ' Admin@Example.com ', role: 'admin' })

    const saved = User.create.mock.calls[0][0]
    expect(saved.email).toBe('admin@example.com')
    expect(saved.password).not.toBe(result.password)
    expect(await bcrypt.compare(result.password, saved.password)).toBe(true)
    expect(result.created).toBe(true)
  })

  it('refuses to overwrite an existing account unless reset is set', async () => {
    User.findOne.mockResolvedValue({ id: 1 })
    await expect(createOrResetUser({ name: 'X', email: 'a@example.com', role: 'admin' })).rejects.toMatchObject({ status: 409 })
  })

  it('rejects an unknown role', async () => {
    await expect(createOrResetUser({ name: 'X', email: 'a@example.com', role: 'superuser' })).rejects.toMatchObject({ status: 422 })
  })

  it('rejects a short password', async () => {
    await expect(createOrResetUser({ name: 'X', email: 'a@example.com', role: 'admin', password: 'short' })).rejects.toMatchObject({ status: 422 })
  })
})

describe('userService.generatePassword', () => {
  it('produces distinct 19-character passwords', () => {
    const a = generatePassword()
    expect(a).toMatch(/^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){3}$/)
    expect(generatePassword()).not.toBe(a)
  })
})
