import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import api from '@/api'
import { makeDetail, makeSubmitted, ok, reject, renderAt, serveApi } from './helpers'

jest.mock('@/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }))

const row = (over = {}) => ({
  id: 9, displayId: 'INS-000009', status: 'submitted', liftId: 3, liftCode: 'LIFT-0427', address: 'Blk 512, Hougang Avenue 10',
  contractorName: 'Apex Lift Engineering', inspectorName: 'Ivy Tan', createdAt: '2026-11-12T02:00:00.000Z', submittedAt: '2026-11-12T03:00:00.000Z',
  totalItems: 25, answeredCount: 25, passCount: 24, defectCount: 1, ...over,
})
const draftRow = row({ id: 4, displayId: 'INS-000004', status: 'draft', submittedAt: null, answeredCount: 10, passCount: 10, defectCount: 0 })
const LIFTS = [
  { id: 3, liftCode: 'LIFT-0427', block: '512', street: 'Hougang Avenue 10', town: 'Hougang', contractorName: 'Apex Lift Engineering', isActive: true },
  { id: 4, liftCode: 'LIFT-0512', block: '33', street: 'Bedok North Road', town: 'Bedok', contractorName: 'Summit Elevators', isActive: true },
]

// Answers GET /inspections by its status param, like the real API
function serveList({ submitted = [row()], drafts = [draftRow], lifts = LIFTS } = {}) {
  serveApi(api, {
    'GET /inspections': (config) => ok(config?.params?.status === 'draft' ? drafts : submitted),
    'GET /lifts': ok(lifts),
  })
}

beforeEach(() => {
  window.URL.createObjectURL = jest.fn(() => 'blob:csv')
  window.URL.revokeObjectURL = jest.fn()
  serveList()
})
afterEach(() => {
  localStorage.clear()
  jest.resetAllMocks()
})

const submittedCalls = () => api.get.mock.calls.filter(([url, c]) => url === '/inspections' && c?.params?.status === 'submitted')

describe('Inspections hub - inspector', () => {
  it('shows New inspection, a Drafts tab with its count, and the submitted list', async () => {
    renderAt('/inspections')
    expect(screen.getByRole('button', { name: /New inspection/ })).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'Drafts (1)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Submitted', selected: true })).toBeInTheDocument()
    expect((await screen.findAllByText('INS-000009')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 defect').length).toBeGreaterThan(0)
  })

  it('opens an inspection when its ID is clicked', async () => {
    renderAt('/inspections')
    const link = (await screen.findAllByRole('link', { name: 'INS-000009' }))[0]
    expect(link).toHaveAttribute('href', '/inspections/9')
  })

  it('lists the inspector’s drafts with progress and a Continue link', async () => {
    renderAt('/inspections')
    await userEvent.click(await screen.findByRole('tab', { name: 'Drafts (1)' }))
    expect(screen.getAllByText('10/25 answered').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Continue' })[0]).toHaveAttribute('href', '/inspections/4')
    expect(screen.getByTestId('location')).toHaveTextContent('/inspections?tab=drafts')
  })

  it('says what to do next when there are no drafts or inspections', async () => {
    serveList({ submitted: [], drafts: [] })
    renderAt('/inspections')
    expect(await screen.findByText('No inspections yet')).toBeInTheDocument()
    expect(screen.getByText(/Start one from New inspection/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Drafts (0)' }))
    expect(screen.getByText('No drafts')).toBeInTheDocument()
  })
})

describe('Inspections hub - admin', () => {
  it('shows submitted inspections but no New inspection button and no Drafts tab', async () => {
    renderAt('/inspections', 'admin')
    expect((await screen.findAllByText('INS-000009')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /New inspection/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    // Never asks for drafts
    expect(api.get.mock.calls.some(([url, c]) => url === '/inspections' && c?.params?.status === 'draft')).toBe(false)
  })

  it('does not offer the inspector-only empty-state action', async () => {
    serveList({ submitted: [] })
    renderAt('/inspections', 'admin')
    expect(await screen.findByText('No inspections yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /New inspection/ })).not.toBeInTheDocument()
  })
})

describe('Filters (F01.11)', () => {
  it('reads the filters from the URL and sends them to the API', async () => {
    renderAt('/inspections?liftId=3&from=2026-11-01&to=2026-11-30&result=defect', 'admin')
    await screen.findAllByText('INS-000009')
    expect(submittedCalls()[0][1].params).toEqual({ status: 'submitted', liftId: '3', from: '2026-11-01', to: '2026-11-30', result: 'defect' })
    expect(screen.getByLabelText('Lift')).toHaveValue('3')
    expect(screen.getByLabelText('From')).toHaveValue('2026-11-01')
    expect(screen.getByLabelText('Result')).toHaveValue('defect')
  })

  it('puts a changed filter in the URL, so Back keeps it', async () => {
    renderAt('/inspections', 'admin')
    await screen.findAllByText('INS-000009')
    await userEvent.selectOptions(screen.getByLabelText('Result'), 'pass')
    expect(screen.getByTestId('location')).toHaveTextContent('/inspections?result=pass')
    await waitFor(() => expect(submittedCalls().at(-1)[1].params).toEqual({ status: 'submitted', result: 'pass' }))
  })

  it('clears every filter', async () => {
    renderAt('/inspections?liftId=3&result=defect', 'admin')
    await screen.findAllByText('INS-000009')
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/inspections$/)
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('explains an empty filtered list and offers to clear the filters', async () => {
    serveList({ submitted: [] })
    renderAt('/inspections?result=defect', 'admin')
    expect(await screen.findByText('No inspections match these filters')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('No inspections yet')).toBeInTheDocument()
  })

  it('pre-selects the lift when arriving from the Lifts page History link', async () => {
    renderAt('/inspections?liftId=4')
    await screen.findAllByText('INS-000009')
    expect(screen.getByLabelText('Lift')).toHaveValue('4')
  })
})

describe('Export CSV (F05.3)', () => {
  it('exports exactly what the filters show, with the count in the label', async () => {
    api.get.mockImplementation((url, config) => {
      if (url === '/inspections/export') return Promise.resolve({ data: new Blob(['a,b']), headers: { 'content-disposition': 'attachment; filename="inspections-20261117.csv"' } })
      if (url === '/inspections') return Promise.resolve({ data: ok(config.params.status === 'draft' ? [] : [row(), row({ id: 10, displayId: 'INS-000010' })]) })
      return Promise.resolve({ data: ok(LIFTS) })
    })
    renderAt('/inspections?liftId=3&result=defect', 'admin')
    const button = await screen.findByRole('button', { name: 'Export CSV (2)' })
    await userEvent.click(button)
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/inspections/export', { params: { liftId: '3', result: 'defect' }, responseType: 'blob' }))
    expect(window.URL.createObjectURL).toHaveBeenCalled()
  })

  it('is disabled when there is nothing to export', async () => {
    serveList({ submitted: [] })
    renderAt('/inspections', 'admin')
    expect(await screen.findByRole('button', { name: 'Export CSV (0)' })).toBeDisabled()
  })

  it('says so when the export fails', async () => {
    api.get.mockImplementation((url, config) => {
      if (url === '/inspections/export') return reject(500, { message: 'boom' })
      if (url === '/inspections') return Promise.resolve({ data: ok(config.params.status === 'draft' ? [] : [row()]) })
      return Promise.resolve({ data: ok(LIFTS) })
    })
    renderAt('/inspections', 'admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Export CSV (1)' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})

describe('Loading and errors', () => {
  it('offers a retry when the list cannot load', async () => {
    serveApi(api, { 'GET /inspections': () => reject(500, { message: 'Server is down' }), 'GET /lifts': ok(LIFTS) })
    renderAt('/inspections', 'admin')
    expect(await screen.findByText('Couldn’t load the inspections')).toBeInTheDocument()
    expect(screen.getByText('Server is down')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('still works when the lift list for the filter cannot load', async () => {
    serveApi(api, { 'GET /inspections': ok([row()]), 'GET /lifts': () => reject(501, { code: 'NOT_IMPLEMENTED' }) })
    renderAt('/inspections', 'admin')
    expect((await screen.findAllByText('INS-000009')).length).toBeGreaterThan(0)
    expect(within(screen.getByLabelText('Lift')).getByRole('option', { name: 'All lifts' })).toBeInTheDocument()
  })
})

describe('New inspection - lift picker', () => {
  it('searches the register and goes to the checklist for the chosen lift', async () => {
    renderAt('/inspections')
    await userEvent.click(screen.getByRole('button', { name: /New inspection/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Which lift are you checking?' })
    expect(await within(dialog).findByText('LIFT-0427')).toBeInTheDocument()

    await userEvent.type(within(dialog).getByRole('searchbox', { name: 'Search lifts' }), 'bedok')
    await waitFor(() => expect(within(dialog).queryByText('LIFT-0427')).not.toBeInTheDocument())
    // The server search is debounced; the list is already narrowed on the page meanwhile
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/lifts', { params: { q: 'bedok' } }))

    serveApi(api, { 'POST /inspections': ok(makeDetail({ id: 8 })), 'GET /checklist-items': ok([], { meta: {} }) })
    await userEvent.click(within(dialog).getByRole('button', { name: /LIFT-0512/ }))
    expect(api.post).toHaveBeenCalledWith('/inspections', { liftId: 4 })
    expect(await screen.findByRole('heading', { name: 'LIFT-0427' })).toBeInTheDocument()
  })

  it('says when nothing matches, and closes with Escape', async () => {
    renderAt('/inspections')
    await userEvent.click(screen.getByRole('button', { name: /New inspection/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('searchbox'), 'zzz')
    expect(await within(dialog).findByText('No lifts match “zzz”.')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('leaves out deactivated lifts', async () => {
    serveList({ lifts: [...LIFTS, { id: 9, liftCode: 'LIFT-0999', block: '1', street: 'Old Road', isActive: false }] })
    renderAt('/inspections')
    await userEvent.click(screen.getByRole('button', { name: /New inspection/ }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('LIFT-0427')
    expect(within(dialog).queryByText('LIFT-0999')).not.toBeInTheDocument()
  })
})

describe('Report (F01.12) and access', () => {
  beforeEach(() => {
    serveApi(api, { 'GET /inspections/9': ok(makeSubmitted({ id: 9, displayId: 'INS-000009' })), 'GET /checklist-items': ok([], { meta: {} }) })
  })

  it('an admin can open a submitted inspection', async () => {
    renderAt('/inspections/9', 'admin')
    expect(await screen.findByRole('heading', { name: 'INS-000009' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Inspections / INS-000009')
    expect(screen.getByRole('link', { name: 'Back to inspections' })).toHaveAttribute('href', '/inspections')
  })

  it('shows the lift, contractor, inspector, counts and the defect with its status badge', async () => {
    renderAt('/inspections/9', 'inspector')
    expect(await screen.findByText('Apex Lift Engineering')).toBeInTheDocument()
    expect(screen.getAllByText('Ivy Tan').length).toBeGreaterThan(0) // also shown in the profile menu
    expect(screen.getByRole('link', { name: /Find in map/ })).toHaveAttribute('target', '_blank')
    // Count tiles: the label sits under its number
    const tile = (label) => screen.getAllByText(label).find((el) => el.tagName === 'P').previousSibling
    expect(tile('Checked')).toHaveTextContent('3')
    expect(tile('Pass')).toHaveTextContent('2')
    expect(tile('Defect')).toHaveTextContent('1')

    const defects = within(screen.getByRole('region', { name: /Defects raised/ }))
    expect(defects.getAllByRole('link', { name: 'DEF-000005' })[0]).toHaveAttribute('href', '/defects/5')
    expect(defects.getAllByText('Open').length).toBeGreaterThan(0) // StatusBadge
    expect(defects.getAllByText('Major').length).toBeGreaterThan(0)
  })

  it('labels every answer with a word, not just a colour', async () => {
    renderAt('/inspections/9', 'admin')
    const results = within(await screen.findByRole('region', { name: 'Checklist results' }))
    expect(results.getAllByText('Pass')).toHaveLength(2)
    expect(results.getAllByText('Defect')).toHaveLength(1)
  })

  it('exports just this inspection', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/inspections/export') return Promise.resolve({ data: new Blob(['x']), headers: {} })
      return Promise.resolve({ data: ok(url === '/inspections/9' ? makeSubmitted({ id: 9, displayId: 'INS-000009' }) : []) })
    })
    renderAt('/inspections/9', 'admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Export this inspection (CSV)' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/inspections/export', { params: { inspectionId: 9 }, responseType: 'blob' }))
  })

  it('shows the success banner only straight after submitting', async () => {
    renderAt('/inspections/9', 'admin')
    await screen.findByRole('heading', { name: 'INS-000009' })
    expect(screen.queryByText(/Submitted · /)).not.toBeInTheDocument()
  })

  it('keeps a contractor out of every inspection page', async () => {
    renderAt('/inspections/9', 'contractor')
    expect(screen.getByText('403 - Forbidden')).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/inspections/9')
  })

  it('keeps an admin out of the new-inspection page (admins cannot start one)', async () => {
    renderAt('/inspections/new?liftId=3', 'admin')
    expect(screen.getByText('403 - Forbidden')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('hides a draft that is not yours', async () => {
    serveApi(api, { 'GET /inspections/4': () => reject(404, { code: 'NOT_FOUND', message: 'Inspection not found' }) })
    renderAt('/inspections/4', 'admin')
    expect(await screen.findByText('We couldn’t find that inspection')).toBeInTheDocument()
  })
})
