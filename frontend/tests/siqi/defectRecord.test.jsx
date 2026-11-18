import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from '@/App'
import api from '@/api'
import { CONTRACTORS, DEFECTS, overview, queryDefects } from '@/prototype/mockData'
import { defectRecordRequest, resetDefectRecords } from '@/prototype/defectRecords'
// Links each demo defect to the inspection and checklist item that found it
import '@/prototype/inspectionRecords'
import { eventTitle, actorText } from '@/pages/defects/defectDisplay'

// Defect detail panel: summary, admin reassign (F02.4) and rectification history (F02.10).
// The shared Axios instance is answered from the prototype handlers with no delay.
jest.mock('@/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }))

const ADMIN = { id: 3, name: 'Aisha Rahman', role: 'admin' }
const findContractor = (id) => {
  const c = CONTRACTORS.find((x) => x.id === id)
  return c ? { ...c, isActive: true } : null
}

// Snapshot of the demo rows, restored after each test (reassigning changes them)
const ORIGINAL = DEFECTS.map((d) => ({ ...d }))

function answer(result) {
  if (result.status >= 400) {
    return Promise.reject(Object.assign(new Error(result.body.message), { response: { status: result.status, data: result.body } }))
  }
  return Promise.resolve({ data: result.body })
}

function serveDemoData() {
  api.get.mockImplementation((url) => {
    if (url === '/contractors') return Promise.resolve({ data: { success: true, data: CONTRACTORS.map((c) => ({ ...c, isActive: true })) } })
    const result = defectRecordRequest({ method: 'get', path: url, findContractor, actor: ADMIN })
    return result ? answer(result) : Promise.resolve({ data: { success: true, data: [] } })
  })
  api.patch.mockImplementation((url, body) => answer(defectRecordRequest({ method: 'patch', path: url, body, findContractor, actor: ADMIN })))
}

function loginAs(role) {
  const payload = btoa(JSON.stringify({ sub: 3, name: 'Aisha Rahman', email: 'admin@demo.ems', role, contractorId: role === 'contractor' ? 1 : null }))
  localStorage.setItem('app_token', `x.${payload}.x`)
}

function renderAt(path, role = 'admin') {
  loginAs(role)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  )
}

const defect = (id) => DEFECTS.find((d) => d.id === id)

beforeEach(() => {
  resetDefectRecords()
  serveDemoData()
})

afterEach(() => {
  DEFECTS.forEach((d, i) => Object.assign(d, ORIGINAL[i]))
  localStorage.clear()
  sessionStorage.clear()
  jest.resetAllMocks()
})

describe('Defect detail', () => {
  it('shows the defect number, item, contractor and severity', async () => {
    renderAt('/defects/81')
    expect(await screen.findByRole('heading', { name: 'DEF-000081' })).toBeInTheDocument()
    const summary = screen.getByRole('region', { name: 'Defect summary' })
    expect(within(summary).getByText('Machine brake wear beyond limit')).toBeInTheDocument()
    expect(within(summary).getByText('Apex Lifts')).toBeInTheDocument()
    expect(within(summary).getByText('Critical')).toBeInTheDocument()
  })

  it('shows an error for a defect that does not exist', async () => {
    renderAt('/defects/9999')
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load this defect')
  })
})

describe('Defect details', () => {
  it('keeps the checklist item, inspection, raiser and location hidden until Show details', async () => {
    const user = userEvent.setup()
    renderAt('/defects/88')
    const summary = await screen.findByRole('region', { name: 'Defect summary' })
    expect(within(summary).getByText('Apex Lifts')).toBeInTheDocument()
    expect(within(summary).queryByText('Checklist item')).not.toBeInTheDocument()

    await user.click(within(summary).getByRole('button', { name: 'Show details' }))
    expect(within(summary).getByText('Checklist item')).toBeInTheDocument()
    expect(summary).toHaveTextContent('LC-02 Door safety edge or sensor reopens the doors')
    const d = DEFECTS.find((x) => x.id === 88)
    expect(within(summary).getByRole('link', { name: d.inspectionCode })).toHaveAttribute('href', `/inspections?report=${d.inspectionId}`)
    expect(summary).toHaveTextContent('Major = fix within 7 days')

    await user.click(within(summary).getByRole('button', { name: 'Hide details' }))
    expect(within(summary).queryByText('Checklist item')).not.toBeInTheDocument()
  })
})

describe('Rectification history', () => {
  it('starts collapsed with a summary, and opens to every step oldest first', async () => {
    const user = userEvent.setup()
    renderAt('/defects/74')   // pending_verification: raised, acknowledged, started, update, signed off
    const toggle = await screen.findByRole('button', { name: /^History/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(toggle).toHaveTextContent('5 entries'))
    expect(screen.queryByRole('list', { name: 'Defect history' })).not.toBeInTheDocument()

    await user.click(toggle)
    const rows = within(screen.getByRole('list', { name: 'Defect history' })).getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('Defect raised')
    expect(rows[0]).toHaveTextContent('Ivy Tan (Inspector)')
    expect(rows[1]).toHaveTextContent('Acknowledged by contractor')
    expect(rows[1]).toHaveTextContent('Marcus Lim (Contractor)')
    expect(rows[3]).toHaveTextContent('Progress update')
    expect(rows[4]).toHaveTextContent('Signed off - waiting for verification')
  })

  it('shows an entry note and details only after it is tapped', async () => {
    const user = userEvent.setup()
    renderAt('/defects/74')
    await user.click(await screen.findByRole('button', { name: /^History/ }))
    const rows = within(screen.getByRole('list', { name: 'Defect history' })).getAllByRole('listitem')

    // Raised: the inspection and checklist item it came from
    expect(rows[0]).not.toHaveTextContent('Found in')
    await user.click(within(rows[0]).getByRole('button'))
    expect(rows[0]).toHaveTextContent('Found in')
    expect(rows[0]).toHaveTextContent('HP-01')
    expect(rows[0]).toHaveTextContent('Assigned to')

    // Sign-off: evidence and confirmation
    await user.click(within(rows[4]).getByRole('button'))
    expect(rows[4]).toHaveTextContent('2 photos attached')
    const photos = within(rows[4]).getAllByRole('img', { name: /^Repair photo/ })
    expect(photos).toHaveLength(2)
    expect(photos[0]).toHaveAttribute('src', '/prototype/photo-placeholder.svg')
    expect(rows[4]).toHaveTextContent('Confirmed the work is done')
    await user.click(within(rows[4]).getByRole('button'))
    expect(rows[4]).not.toHaveTextContent('2 photos attached')
  })

  it('shows a rejected repair in red with its reason', async () => {
    const user = userEvent.setup()
    renderAt('/defects/70')   // repair rejected once, back in progress
    const toggle = await screen.findByRole('button', { name: /^History/ })
    await waitFor(() => expect(toggle).toHaveTextContent('1 rejected repair'))
    await user.click(toggle)
    const rejected = within(screen.getByRole('list', { name: 'Defect history' })).getAllByRole('listitem')
      .find((li) => li.textContent.includes('Repair rejected'))
    await user.click(within(rejected).getByRole('button'))
    expect(rejected).toHaveTextContent('Reason: Car still stops about 8 mm below level 5')
  })

  it('shows an error with Try again when the history fails to load', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/history')) return Promise.reject(Object.assign(new Error('boom'), { response: { status: 500, data: {} } }))
      return answer(defectRecordRequest({ method: 'get', path: url, findContractor, actor: ADMIN }))
    })
    renderAt('/defects/74')
    const toggle = await screen.findByRole('button', { name: /^History/ })
    await waitFor(() => expect(toggle).toHaveTextContent('Couldn’t load the history'))
    await userEvent.click(toggle)
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the history')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('Reassign', () => {
  it('moves the defect to another company and adds the move to the history', async () => {
    const user = userEvent.setup()
    renderAt('/defects/81')
    await user.click(await screen.findByRole('button', { name: 'Reassign' }))

    const form = screen.getByRole('form', { name: 'Reassign defect' })
    const select = within(form).getByLabelText('Move to')
    await within(form).findByRole('option', { name: 'Summit Elevators' })
    // The current company is not offered
    expect(within(select).queryByRole('option', { name: 'Apex Lifts' })).not.toBeInTheDocument()

    await user.selectOptions(select, 'Summit Elevators')
    await user.type(within(form).getByLabelText('Reason'), '  Contract moved to Summit  ')
    await user.click(within(form).getByRole('button', { name: 'Reassign' }))

    expect(api.patch).toHaveBeenCalledWith('/defects/81/assign', { contractorId: 2, reason: 'Contract moved to Summit' })
    expect(await screen.findByRole('status')).toHaveTextContent('Reassigned to Summit Elevators')
    const summary = screen.getByRole('region', { name: 'Defect summary' })
    expect(await within(summary).findByText('Summit Elevators')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^History/ }))
    await waitFor(() => {
      const items = within(screen.getByRole('list', { name: 'Defect history' })).getAllByRole('listitem')
      expect(items[items.length - 1]).toHaveTextContent('Reassigned to another contractor')
    })
    const rows = within(screen.getByRole('list', { name: 'Defect history' })).getAllByRole('listitem')
    const last = rows[rows.length - 1]
    expect(last).toHaveTextContent('Aisha Rahman (EMS admin)')
    await user.click(within(last).getByRole('button'))
    expect(last).toHaveTextContent('From Apex Lifts to Summit Elevators. Reason: Contract moved to Summit')
  })

  it('needs a contractor and a reason before sending', async () => {
    const user = userEvent.setup()
    renderAt('/defects/81')
    await user.click(await screen.findByRole('button', { name: 'Reassign' }))
    const form = screen.getByRole('form', { name: 'Reassign defect' })
    await user.click(within(form).getByRole('button', { name: 'Reassign' }))

    expect(await within(form).findByText('Choose a contractor')).toBeInTheDocument()
    expect(within(form).getByText('A reason is required')).toBeInTheDocument()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('shows the server message and keeps the form open when it is refused', async () => {
    const user = userEvent.setup()
    renderAt('/defects/81')
    api.patch.mockRejectedValue(Object.assign(new Error('409'), {
      response: { status: 409, data: { success: false, code: 'DEFECT_CLOSED', message: 'A closed defect cannot be reassigned' } },
    }))
    await user.click(await screen.findByRole('button', { name: 'Reassign' }))
    const form = screen.getByRole('form', { name: 'Reassign defect' })
    await within(form).findByRole('option', { name: 'Summit Elevators' })
    await user.selectOptions(within(form).getByLabelText('Move to'), 'Summit Elevators')
    await user.type(within(form).getByLabelText('Reason'), 'Contract changed')
    await user.click(within(form).getByRole('button', { name: 'Reassign' }))

    expect(await within(form).findByRole('alert')).toHaveTextContent('A closed defect cannot be reassigned')
  })

  it('Cancel closes the form without sending anything', async () => {
    const user = userEvent.setup()
    renderAt('/defects/81')
    await user.click(await screen.findByRole('button', { name: 'Reassign' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('form', { name: 'Reassign defect' })).not.toBeInTheDocument()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('is not offered to an inspector', async () => {
    renderAt('/defects/81', 'inspector')
    await screen.findByRole('region', { name: 'Defect summary' })
    expect(screen.queryByRole('button', { name: 'Reassign' })).not.toBeInTheDocument()
  })

  it('is not offered for a closed defect', async () => {
    renderAt('/defects/49')
    await screen.findByRole('region', { name: 'Defect summary' })
    expect(screen.queryByRole('button', { name: 'Reassign' })).not.toBeInTheDocument()
  })
})

describe('Prototype defect records', () => {
  const assign = (id, body) => defectRecordRequest({ method: 'patch', path: `/defects/${id}/assign`, body, findContractor, actor: ADMIN })

  it('moves the defect between companies in the list and the overview counts', () => {
    const apexBefore = queryDefects({ contractorId: 1 }).length
    const summitOpenBefore = overview('all').byContractor.find((c) => c.contractorId === 2).open

    expect(assign(81, { contractorId: 2, reason: 'Contract changed' }).status).toBe(200)

    expect(queryDefects({ contractorId: 1 })).toHaveLength(apexBefore - 1)
    expect(queryDefects({ contractorId: 2 }).map((d) => d.id)).toContain(81)
    expect(overview('all').byContractor.find((c) => c.contractorId === 2).open).toBe(summitOpenBefore + 1)
    expect(defect(81).status).toBe('in_progress')
  })

  it.each([
    ['a closed defect', 49, { contractorId: 2, reason: 'Contract changed' }, 409, 'DEFECT_CLOSED'],
    ['the same contractor', 81, { contractorId: 1, reason: 'Contract changed' }, 422, 'VALIDATION_ERROR'],
    ['an unknown contractor', 81, { contractorId: 99, reason: 'Contract changed' }, 422, 'VALIDATION_ERROR'],
    ['a blank reason', 81, { contractorId: 2, reason: '  ' }, 422, 'VALIDATION_ERROR'],
  ])('refuses %s like the backend does', (_, id, body, status, code) => {
    const res = assign(id, body)
    expect(res.status).toBe(status)
    expect(res.body.code).toBe(code)
  })

  it('builds history that matches each defect\'s status', () => {
    const history = (id) => defectRecordRequest({ method: 'get', path: `/defects/${id}/history` }).body.data
    expect(history(88).map((e) => e.toStatus)).toEqual(['open'])
    expect(history(74).map((e) => e.toStatus)).toEqual(['open', 'acknowledged', 'in_progress', null, 'pending_verification'])
    // 49 had its first repair rejected, then fixed and approved
    const loop = history(49)
    expect(loop.map((e) => e.toStatus).filter(Boolean)).toEqual(['open', 'acknowledged', 'in_progress', 'pending_verification', 'in_progress', 'pending_verification', 'closed'])
    expect(loop.find((e) => e.fromStatus === 'pending_verification' && e.toStatus === 'in_progress').note).toMatch(/rubber is loose/)
    // In order, and never in the future
    const times = loop.map((e) => new Date(e.createdAt).getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(times.every((t) => t <= Date.now())).toBe(true)
  })
})

describe('History labels', () => {
  it('names a rejected repair and other actions plainly', () => {
    expect(eventTitle({ action: 'status_change', fromStatus: 'pending_verification', toStatus: 'in_progress' }))
      .toEqual({ title: 'Repair rejected - returned for more work', tone: 'danger' })
    expect(eventTitle({ action: 'status_change', fromStatus: 'pending_verification', toStatus: 'closed' }).tone).toBe('success')
    expect(eventTitle({ action: 'update_posted' }).title).toBe('Progress update')
    expect(eventTitle({ action: 'photo_added' }).title).toBe('Photo added')
    expect(actorText(null)).toBe('System')
  })
})
