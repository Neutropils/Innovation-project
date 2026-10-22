import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from '@/App'

// Fake a logged-in user - AuthContext only decodes the JWT payload, it doesn't verify it
function loginAs(role) {
  const payload = btoa(JSON.stringify({ sub: 1, name: 'Test', email: 't@example.com', role }))
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

describe('route guards', () => {
  it('sends signed-out users to the login page', () => {
    renderAt('/dashboard')
    expect(screen.getByText(/Login page/)).toBeInTheDocument()
  })

  it('shows the dashboard to a member', () => {
    loginAs('member')
    renderAt('/dashboard')
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('blocks members from admin pages', () => {
    loginAs('member')
    renderAt('/admin')
    expect(screen.getByText('403 - Forbidden')).toBeInTheDocument()
  })

  it('lets admins into admin pages', () => {
    loginAs('admin')
    renderAt('/admin')
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
  })
})
