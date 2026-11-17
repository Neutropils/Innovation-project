import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from '@/App'

// Shared by Kandha's page tests. Each test file mocks '@/api' as { get, post, put }.

const ACCOUNTS = {
  inspector: { sub: 10, name: 'Ivy Tan', email: 'inspector@demo.ems', role: 'inspector', contractorId: null },
  admin: { sub: 3, name: 'Aisha Rahman', email: 'admin@demo.ems', role: 'admin', contractorId: null },
  contractor: { sub: 30, name: 'Marcus Lim', email: 'contractor@demo.ems', role: 'contractor', contractorId: 1 },
}

// Shows where the router ended up, so tests can assert a navigation
function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname + location.search}</p>
}

export function renderAt(path, role = 'inspector') {
  localStorage.setItem('app_token', `x.${btoa(JSON.stringify(ACCOUNTS[role]))}.x`)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>
  )
}

// Three checklist items in two sections - enough to test per-section behaviour
export const ITEMS = [
  { checklistItemId: 1, code: 'MR-01', section: 'Motor room', itemText: 'Machine runs quietly', sortOrder: 1 },
  { checklistItemId: 2, code: 'MR-02', section: 'Motor room', itemText: 'Brake works', sortOrder: 2 },
  { checklistItemId: 3, code: 'LC-01', section: 'Lift car', itemText: 'Doors close smoothly', sortOrder: 3 },
]

export function makeDetail(overrides = {}) {
  const results = ITEMS.map((i) => ({ ...i, result: null, description: null, location: null, severity: null, photos: [], defectId: null }))
  return {
    id: 7,
    displayId: 'INS-000007',
    status: 'draft',
    createdAt: '2026-11-12T02:00:00.000Z',
    submittedAt: null,
    lift: { id: 3, liftCode: 'LIFT-0427', block: '512', street: 'Hougang Avenue 10', town: 'Hougang', postalCode: '530512', address: 'Blk 512, Hougang Avenue 10, Hougang' },
    contractor: { id: 1, name: 'Apex Lift Engineering' },
    inspector: { id: 10, name: 'Ivy Tan' },
    counts: { total: 3, answered: 0, pass: 0, defect: 0 },
    results,
    defects: [],
    ...overrides,
  }
}

// A submitted inspection with one defect, as the API returns it
export function makeSubmitted(overrides = {}) {
  const results = ITEMS.map((i) => ({ ...i, result: 'pass', description: null, location: null, severity: null, photos: [], defectId: null }))
  results[1] = { ...results[1], result: 'defect', description: 'Brake squeals', location: 'Motor room', severity: 'major', defectId: 5 }
  return makeDetail({
    status: 'submitted',
    submittedAt: '2026-11-12T03:00:00.000Z',
    counts: { total: 3, answered: 3, pass: 2, defect: 1 },
    results,
    defects: [{
      id: 5, displayId: 'DEF-000005', inspectionResultId: 102, checklistItemId: 2, itemCode: 'MR-02', itemText: 'Brake works',
      description: 'Brake squeals', location: 'Motor room', severity: 'major', status: 'open', dueDate: '2999-01-01',
    }],
    ...overrides,
  })
}

export const META = { total: 3, severityDueDays: { critical: 1, major: 7, minor: 14 } }

// Wires the mocked api: routes is { 'GET /inspections/7': value | (config, body) => value }.
// A value is wrapped as { data: <value> }; return api.reject(...) to fail.
export function serveApi(api, routes) {
  const answer = (method, url, a, b) => {
    const key = `${method} ${url}`
    if (!(key in routes)) return Promise.resolve({ data: { success: true, data: [] } })
    const entry = routes[key]
    const value = typeof entry === 'function' ? entry(a, b) : entry
    return value instanceof Promise ? value : Promise.resolve({ data: value })
  }
  api.get.mockImplementation((url, config) => answer('GET', url, config))
  api.post.mockImplementation((url, body) => answer('POST', url, body))
  api.put.mockImplementation((url, body) => answer('PUT', url, body))
}

export const reject = (status, data) => Promise.reject(Object.assign(new Error('request failed'), { response: { status, data } }))
export const ok = (data, extra = {}) => ({ success: true, data, ...extra })
