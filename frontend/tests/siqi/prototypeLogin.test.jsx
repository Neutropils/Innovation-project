import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from '@/App'
import api from '@/api'
import { mockAdapter } from '@/prototype/mockApi'

// Route the shared instance through the real prototype adapter
jest.mock('@/api', () => ({ __esModule: true, default: { post: jest.fn() } }))

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  )
}

afterEach(() => {
  localStorage.clear()
  jest.resetAllMocks()
})

describe('Login prototype flow', () => {
  beforeEach(() => {
    api.post.mockImplementation((url, data) => mockAdapter({ method: 'post', url, data }))
  })

  it('fills a demo account and signs in to the role home', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Contractor' }))
    expect(screen.getByLabelText('Email')).toHaveValue('contractor@demo.ems')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: 'Inbox' }, { timeout: 3000 })).toBeInTheDocument()
  })

  it('shows the deactivated-account error scenario', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Deactivated' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('deactivated')
  })
})

describe('Login when the backend is down', () => {
  it('says the server cannot be reached for a proxy 500 with no API code', async () => {
    api.post.mockRejectedValue({ response: { status: 500, data: '' } })
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), 'i@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
  })
})
