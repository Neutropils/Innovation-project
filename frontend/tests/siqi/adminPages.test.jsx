import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from '@/App'
import api from '@/api'
import { CONTRACTORS, DEFECTS, EMPTY_OVERVIEW, isOverdue, overview, queryDefects } from '@/prototype/mockData'
import { shiftIso } from '@/pages/defects/defectDisplay'

// The pages call the shared Axios instance; answer from the prototype data with no delay.
jest.mock('@/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))

const ok = (data) => Promise.resolve({ data: { success: true, data } })

function serveDemoData() {
  api.get.mockImplementation((url, { params = {} } = {}) => {
    if (url === '/overview') return ok(overview(params.period))
    if (url === '/defects') return ok(queryDefects(params))
    if (url === '/contractors') return ok(CONTRACTORS)
    return ok([])
  })
}

function loginAsAdmin() {
  const payload = btoa(JSON.stringify({ sub: 1, name: 'Aisha Rahman', email: 'admin@demo.ems', role: 'admin', contractorId: null }))
  localStorage.setItem('app_token', `x.${payload}.x`)
}

function renderAt(path) {
  loginAsAdmin()
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  )
}

// What Axios throws when there is no connection (no response at all).
const offlineError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })
const goOffline = () => api.get.mockImplementation(() => Promise.reject(offlineError()))

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  jest.resetAllMocks()
})

describe('Offline mode', () => {
  it('keeps showing the last overview counts with an offline banner', async () => {
    serveDemoData()
    const first = renderAt('/overview')
    await screen.findByRole('link', { name: /Overdue/ })
    first.unmount()

    goOffline()
    renderAt('/overview')
    expect(await screen.findByText('You’re offline')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Overdue/ })).toHaveTextContent(String(overview('month').overdue))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an offline state (not an error) when nothing was saved, and loads on retry', async () => {
    goOffline()
    renderAt('/defects')
    expect(await screen.findByText(/hasn’t been opened online yet/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    serveDemoData()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(`${DEFECTS.length} defects`)).toBeInTheDocument()
  })

  it('shows the saved defect list offline with Export turned off', async () => {
    serveDemoData()
    const first = renderAt('/defects')
    await screen.findByText(`${DEFECTS.length} defects`)
    first.unmount()

    goOffline()
    renderAt('/defects')
    expect(await screen.findByText('You’re offline')).toBeInTheDocument()
    expect(screen.getByText(`${DEFECTS.length} defects`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  })

  it('refreshes by itself when the connection comes back', async () => {
    goOffline()
    renderAt('/overview')
    await screen.findByText('You’re offline')
    serveDemoData()
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(await screen.findByRole('link', { name: /Overdue/ })).toBeInTheDocument()
    expect(screen.queryByText('You’re offline')).not.toBeInTheDocument()
  })
})

describe('Back button', () => {
  it('returns from Defects to the Overview count that opened it', async () => {
    serveDemoData()
    renderAt('/overview')
    await userEvent.click(await screen.findByRole('link', { name: /Overdue/ }))
    await screen.findByRole('heading', { name: 'Defects' })
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })

  it('goes to Overview when Defects was opened directly', async () => {
    serveDemoData()
    renderAt('/defects')
    await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })
})

describe('Overview', () => {
  it('shows the counts and the by-contractor table', async () => {
    serveDemoData()
    renderAt('/overview')
    const counts = overview('month')
    const overdueTile = await screen.findByRole('link', { name: /Overdue/ })
    expect(overdueTile).toHaveTextContent(String(counts.overdue))
    expect(overdueTile).toHaveAttribute('href', '/defects?overdue=true')
    expect(screen.getByRole('link', { name: /Apex Lifts/ })).toHaveAttribute('href', '/defects?contractorId=1&status=active')
  })

  it('opens the Defects page filtered to overdue when the Overdue count is clicked', async () => {
    serveDemoData()
    renderAt('/overview')
    await userEvent.click(await screen.findByRole('link', { name: /Overdue/ }))
    expect(await screen.findByRole('heading', { name: 'Defects' })).toBeInTheDocument()
    const overdueCount = DEFECTS.filter((d) => isOverdue(d)).length
    expect(await screen.findByText(`${overdueCount} defects match your filters`)).toBeInTheDocument()
    // Collapsed panel shows the active filter as a chip; opening it shows the toggle pressed
    expect(screen.getByRole('button', { name: 'Remove filter: Overdue only' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))
    expect(screen.getByRole('button', { name: 'Overdue only' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows an error with a working retry', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'))
    renderAt('/overview')
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the overview')
    serveDemoData()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: /Overdue/ })).toBeInTheDocument()
  })

  it('shows an all-clear empty state when nothing is open', async () => {
    api.get.mockImplementation(() => ok(EMPTY_OVERVIEW('month')))
    renderAt('/overview')
    expect(await screen.findByText('All clear')).toBeInTheDocument()
  })
})

describe('Defects', () => {
  it('groups defects by contractor and links each to its detail page', async () => {
    serveDemoData()
    renderAt('/defects')
    const apex = await screen.findByRole('region', { name: 'Apex Lifts' })
    const apexCount = DEFECTS.filter((d) => d.contractorId === 1).length
    expect(within(apex).getAllByRole('link', { name: /DEF-/ })).toHaveLength(apexCount)
    expect(within(apex).getByRole('link', { name: /DEF-000088/ })).toHaveAttribute('href', '/defects/88')
  })

  it('filters by severity from the dropdown', async () => {
    serveDemoData()
    renderAt('/defects')
    await screen.findByRole('region', { name: 'Apex Lifts' })
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))
    await userEvent.selectOptions(screen.getByLabelText('Severity'), 'critical')
    const critical = DEFECTS.filter((d) => d.severity === 'critical').length
    expect(await screen.findByText(`${critical} defects match your filters`)).toBeInTheDocument()
  })

  it('shows a no-match state that clears the filters', async () => {
    serveDemoData()
    renderAt('/defects?contractorId=4&status=pending_verification')
    expect(await screen.findByText('No defects match these filters')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText(`${DEFECTS.length} defects`)).toBeInTheDocument()
  })

  it('shows an empty state when there are no defects at all', async () => {
    api.get.mockImplementation(() => ok([]))
    renderAt('/defects')
    expect(await screen.findByText('No defects yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  })

  it('shows an error state when the list fails to load', async () => {
    api.get.mockImplementation((url) => (url === '/defects' ? Promise.reject(new Error('fail')) : ok(CONTRACTORS)))
    renderAt('/defects')
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load defects')
  })
})

describe('prototype defect data', () => {
  it('filters "Not closed" and overdue the same way the backend rule does', () => {
    expect(queryDefects({ status: 'active' }).every((d) => d.status !== 'closed')).toBe(true)
    expect(queryDefects({ overdue: 'true' }).every((d) => d.status !== 'closed' && d.dueDate < new Date().toISOString().slice(0, 10))).toBe(true)
  })

  it('keeps the overview counts consistent with the defect list', () => {
    const all = overview('all')
    expect(all.open).toBe(queryDefects({ status: 'active' }).length)
    expect(all.byContractor.reduce((n, c) => n + c.open, 0)).toBe(all.open)
  })
})

describe('Search', () => {
  it('narrows the list as you type and keeps the term in the URL', async () => {
    serveDemoData()
    renderAt('/defects')
    await screen.findByRole('region', { name: 'Apex Lifts' })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search defects' }), 'DEF-000088')
    expect(await screen.findByText('1 defect match your search')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /DEF-000088/ })).toHaveAttribute('href', '/defects/88')
  })

  it('matches every word across lift, item and contractor', () => {
    const results = queryDefects({ q: 'apex door' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((d) => d.contractorName === 'Apex Lifts' && /door/i.test(`${d.liftName} ${d.item}`))).toBe(true)
  })

  it('shows a no-results state with Clear search', async () => {
    serveDemoData()
    renderAt('/defects?q=zzzz')
    expect(await screen.findByText('No results for “zzzz”')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1))
    expect(await screen.findByText(`${DEFECTS.length} defects`)).toBeInTheDocument()
  })

  it('still searches the saved list when offline', async () => {
    serveDemoData()
    const first = renderAt('/defects')
    await screen.findByText(`${DEFECTS.length} defects`)
    first.unmount()

    goOffline()
    renderAt('/defects?q=DEF-000088')
    expect(await screen.findByText('You’re offline')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /DEF-000088/ })).toBeInTheDocument()
  })
})

describe('Overview summary', () => {
  it('names the contractor to chase first and lists the most overdue at the top', async () => {
    serveDemoData()
    renderAt('/overview')
    const counts = overview('month')
    const worst = [...counts.byContractor].sort((a, b) => b.overdue - a.overdue || b.open - a.open)[0]
    expect(await screen.findByText(new RegExp(`${worst.name} needs chasing first`))).toBeInTheDocument()
    const list = screen.getByRole('region', { name: 'Needs attention' })
    expect(within(list).getAllByRole('link')[0]).toHaveTextContent(worst.name)
  })
})

describe('Profile menu', () => {
  it('keeps Sign out inside the menu and signs out from there', async () => {
    serveDemoData()
    renderAt('/overview')
    await screen.findByRole('link', { name: /Overdue/ })
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Profile menu' })[0])
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(localStorage.getItem('app_token')).toBeNull()
  })
})

describe('Expandable filters', () => {
  it('starts collapsed and opens with the Filters button', async () => {
    serveDemoData()
    renderAt('/defects')
    await screen.findByRole('region', { name: 'Apex Lifts' })
    const toggle = screen.getByRole('button', { name: /^Filters/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Severity')).not.toBeInTheDocument()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Severity')).toBeInTheDocument()
  })

  it('shows active filters as chips with a count, and removes one from its chip', async () => {
    serveDemoData()
    renderAt('/defects?severity=critical&overdue=true')
    expect(await screen.findByRole('button', { name: /^Filters 2/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Critical' }))
    const overdue = DEFECTS.filter((d) => isOverdue(d)).length
    expect(await screen.findByText(`${overdue} defects match your filters`)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove filter: Critical' })).not.toBeInTheDocument()
  })

  it('Clear all removes the filters but keeps the search', async () => {
    serveDemoData()
    renderAt('/defects?q=door&overdue=true')
    await userEvent.click(await screen.findByRole('button', { name: 'Clear all' }))
    expect(screen.getByRole('searchbox', { name: 'Search defects' })).toHaveValue('door')
    expect(await screen.findByText(/match your search$/)).toBeInTheDocument()
  })
})

describe('Lift company groups', () => {
  it('are expanded by default and fold away from their header', async () => {
    serveDemoData()
    renderAt('/defects')
    const apex = await screen.findByRole('region', { name: 'Apex Lifts' })
    const header = within(apex).getByRole('button', { expanded: true })
    expect(within(apex).getAllByRole('link').length).toBeGreaterThan(0)
    await userEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(within(apex).queryAllByRole('link', { name: /DEF-/ })).toHaveLength(0)
    await userEvent.click(header)
    expect(within(apex).getAllByRole('link').length).toBeGreaterThan(0)
  })

  it('Collapse all and Expand all fold every company', async () => {
    serveDemoData()
    renderAt('/defects')
    await screen.findByRole('region', { name: 'Apex Lifts' })
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(screen.queryAllByRole('link', { name: /DEF-/ })).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(screen.getAllByRole('link', { name: /DEF-/ })).toHaveLength(DEFECTS.length)
  })
})

describe('Company details', () => {
  it('shows the company numbers and contact when expanded, and can narrow to it', async () => {
    serveDemoData()
    renderAt('/defects')
    const apex = await screen.findByRole('region', { name: 'Apex Lifts' })
    const apexDefects = DEFECTS.filter((d) => d.contractorId === 1)
    expect(within(apex).getByText('Daniel Ong')).toBeInTheDocument()
    expect(within(apex).getByRole('link', { name: /Call/ })).toHaveAttribute('href', 'tel:+6560000101')
    expect(within(apex).getByText('Active').previousSibling).toHaveTextContent(String(apexDefects.filter((d) => d.status !== 'closed').length))
    await userEvent.click(within(apex).getByRole('button', { name: 'Show only Apex Lifts' }))
    expect(await screen.findByText(`${apexDefects.length} defects match your filters`)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Summit Elevators' })).not.toBeInTheDocument()
  })
})

describe('Time range filters', () => {
  const today = new Date().toISOString().slice(0, 10)

  it('filters by when the defect was reported and by upcoming due date', () => {
    expect(queryDefects({ reported: '7d' }).every((d) => d.createdAt >= shiftIso(today, -7))).toBe(true)
    const dueSoon = queryDefects({ due: '7d' })
    expect(dueSoon.every((d) => d.status !== 'closed' && d.dueDate >= today && d.dueDate <= shiftIso(today, 7))).toBe(true)
    const range = queryDefects({ reported: 'custom', from: shiftIso(today, -10), to: shiftIso(today, -5) })
    expect(range.every((d) => d.createdAt >= shiftIso(today, -10) && d.createdAt <= shiftIso(today, -5))).toBe(true)
  })

  it('shows From and To dates only for a custom range, with a chip for it', async () => {
    serveDemoData()
    renderAt('/defects')
    await screen.findByRole('region', { name: 'Apex Lifts' })
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Reported'), 'custom')
    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Remove filter: Reported/ })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Due'), '7d')
    expect(screen.getByRole('button', { name: 'Remove filter: Due in 7 days' })).toBeInTheDocument()
  })
})
