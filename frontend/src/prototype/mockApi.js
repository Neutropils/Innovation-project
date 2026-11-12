import { AxiosError } from 'axios'

// Prototype mode: the app runs with no backend so it can be demoed anywhere.
// Every request made through the shared Axios instance is answered here instead of /api.
// Set VITE_PROTOTYPE=false in frontend/.env to talk to the real backend again.
export const PROTOTYPE = import.meta.env.VITE_PROTOTYPE !== 'false'

// Fictional demo password - prototype only, never a real credential.
export const DEMO_PASSWORD = 'Demo@1234'

export const DEMO_ACCOUNTS = [
  { label: 'Inspector',  email: 'inspector@demo.ems',  name: 'Ivy Tan',      role: 'inspector',  contractorId: null },
  { label: 'Contractor', email: 'contractor@demo.ems', name: 'Marcus Lim',   role: 'contractor', contractorId: 1 },
  { label: 'Admin',      email: 'admin@demo.ems',      name: 'Aisha Rahman', role: 'admin',      contractorId: null },
]

// Emails that trigger each error state, so the presenter can show them on demand.
export const DEMO_SCENARIOS = [
  { label: 'Wrong password', email: 'inspector@demo.ems', password: 'wrong-password' },
  { label: 'Deactivated',    email: 'disabled@demo.ems',  password: DEMO_PASSWORD },
  { label: 'Offline',        email: 'offline@demo.ems',   password: DEMO_PASSWORD },
  { label: 'Server error',   email: 'error@demo.ems',     password: DEMO_PASSWORD },
]

const LATENCY_MS = 700
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Unsigned JWT with the same claims the backend puts in its tokens.
// AuthContext only decodes the payload for routing, so no signature is needed.
function fakeToken(account) {
  const claims = {
    sub: DEMO_ACCOUNTS.indexOf(account) + 1,
    name: account.name,
    email: account.email,
    role: account.role,
    contractorId: account.contractorId,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  }
  return `prototype.${btoa(JSON.stringify(claims))}.unsigned`
}

// Builds a response the same shape the real API sends, throwing for error statuses
// exactly like Axios does, so the pages handle both identically.
function reply(config, status, data) {
  const response = { data, status, statusText: '', headers: {}, config }
  if (status >= 400) {
    const code = status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST
    throw new AxiosError(data?.message, code, config, null, response)
  }
  return response
}

function fail(config, status, code, message) {
  return reply(config, status, { success: false, code, message })
}

function login(config, body) {
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  if (email === 'offline@demo.ems') throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
  if (email === 'error@demo.ems') return fail(config, 500, 'INTERNAL_ERROR', 'Unexpected error')
  if (email === 'disabled@demo.ems') {
    return fail(config, 403, 'ACCOUNT_DISABLED', 'This account has been deactivated. Contact your administrator.')
  }

  const account = DEMO_ACCOUNTS.find((a) => a.email === email)
  if (!account || password !== DEMO_PASSWORD) {
    return fail(config, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
  }
  const { name, role } = account
  return reply(config, 200, { success: true, data: { token: fakeToken(account), user: { id: 1, name, email, role } } })
}

// Axios adapter: replaces the network layer for the shared instance in prototype mode.
export async function mockAdapter(config) {
  await delay(LATENCY_MS)
  const url = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data ?? {})

  if (method === 'post' && url.endsWith('/auth/login')) return login(config, body)
  // Lists have no demo data yet, so pages show their empty state.
  if (method === 'get') return reply(config, 200, { success: true, data: [] })
  return fail(config, 404, 'NOT_FOUND', 'Not available in the prototype yet.')
}
