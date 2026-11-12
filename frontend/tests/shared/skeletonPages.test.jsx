import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from '@/App'
import StatusBadge, { isOverdue } from '@/components/StatusBadge'

// Every page in design/screens.md is routed and guarded (skeleton PR).
// When you build a page, keep its row here passing - the heading should stay the same.

function loginAs(role) {
  const payload = btoa(JSON.stringify({ sub: 1, name: 'Test', email: 't@example.com', role, contractorId: role === 'contractor' ? 2 : null }))
  localStorage.setItem('app_token', `x.${payload}.x`)
}

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  )
}

afterEach(() => localStorage.clear())

// [path, heading, a role allowed in, a role kept out]
const PAGES = [
  ['/lifts', 'Lifts', 'inspector', 'contractor'],
  ['/inspections', 'Inspections', 'admin', 'contractor'],
  ['/inspections/new?liftId=3', 'Inspection', 'inspector', 'admin'],
  ['/inspections/12', 'Inspection', 'inspector', 'contractor'],
  ['/defects', 'Defects', 'inspector', 'contractor'],
  ['/defects/7', 'Defect 7', 'contractor', 'member'],
  ['/inbox', 'Inbox', 'contractor', 'inspector'],
  ['/overview', 'Overview', 'admin', 'inspector'],
]

describe.each(PAGES)('%s', (path, heading, allowed, refused) => {
  it(`opens for a ${allowed}`, () => {
    loginAs(allowed)
    renderAt(path)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it(`is forbidden for a ${refused}`, () => {
    loginAs(refused)
    renderAt(path)
    expect(screen.getByText('403 - Forbidden')).toBeInTheDocument()
  })
})

describe('navigation', () => {
  it.each([
    ['inspector', ['Lifts', 'Inspections', 'Defects']],
    ['contractor', ['Inbox']],
    ['admin', ['Lifts', 'Inspections', 'Overview', 'Defects', 'Admin']],
  ])('shows a %s only their pages', (role, labels) => {
    loginAs(role)
    renderAt('/')
    // The bottom nav (phones) is the last <nav>; the sidebar (desktop) holds the same links
    const navs = screen.getAllByRole('navigation')
    const links = within(navs[navs.length - 1]).getAllByRole('link').map((a) => a.textContent)
    expect(links).toEqual(labels)
  })
})

describe('StatusBadge', () => {
  it('shows the readable status', () => {
    render(<StatusBadge status="pending_verification" />)
    expect(screen.getByText('Pending verification')).toBeInTheDocument()
  })

  it('adds an Overdue pill when past due', () => {
    render(<StatusBadge status="in_progress" dueDate="2020-01-01" />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('never marks a closed defect overdue', () => {
    expect(isOverdue('closed', '2020-01-01')).toBe(false)
    expect(isOverdue('open', '2999-01-01')).toBe(false)
  })
})
