import { mockAdapter, DEMO_PASSWORD } from '@/prototype/mockApi'

const loginWith = (email, password) =>
  mockAdapter({ method: 'post', url: '/auth/login', data: JSON.stringify({ email, password }) })

const payloadOf = (token) => JSON.parse(atob(token.split('.')[1]))

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

async function settle(promise) {
  const result = promise.then((r) => ({ ok: r }), (e) => ({ err: e }))
  await jest.runAllTimersAsync()
  return result
}

describe('prototype mock API - login', () => {
  it('signs a demo account in with a token carrying its role', async () => {
    const { ok } = await settle(loginWith(' Contractor@demo.ems ', DEMO_PASSWORD))
    expect(ok.status).toBe(200)
    const claims = payloadOf(ok.data.data.token)
    expect(claims).toMatchObject({ role: 'contractor', email: 'contractor@demo.ems', contractorId: 1 })
    expect(claims.exp * 1000).toBeGreaterThan(Date.now())
  })

  it('rejects a wrong password with 401', async () => {
    const { err } = await settle(loginWith('inspector@demo.ems', 'nope'))
    expect(err.response.status).toBe(401)
    expect(err.response.data.code).toBe('INVALID_CREDENTIALS')
  })

  it('rejects a deactivated account with 403', async () => {
    const { err } = await settle(loginWith('disabled@demo.ems', DEMO_PASSWORD))
    expect(err.response.status).toBe(403)
    expect(err.response.data.message).toMatch(/deactivated/)
  })

  it('simulates a network failure with no response', async () => {
    const { err } = await settle(loginWith('offline@demo.ems', DEMO_PASSWORD))
    expect(err.response).toBeUndefined()
    expect(err.code).toBe('ERR_NETWORK')
  })

  it('simulates a server error with 500', async () => {
    const { err } = await settle(loginWith('error@demo.ems', DEMO_PASSWORD))
    expect(err.response.status).toBe(500)
    expect(err.response.data.code).toBe('INTERNAL_ERROR')
  })
})
