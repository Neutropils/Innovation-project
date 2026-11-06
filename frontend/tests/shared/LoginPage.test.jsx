import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from '@/App'
import api from '@/api'

jest.mock('@/api', () => ({ __esModule: true, default: { post: jest.fn() } }))

// Builds an unsigned JWT - AuthContext only decodes the payload for UI routing
function fakeToken(claims) {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims }))
  return `x.${payload}.x`
}

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

describe('LoginPage', () => {
  it('shows validation errors and does not call the API when fields are empty', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('rejects a malformed email', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('Password'), 'whatever1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('signs in and lands on the role home page', async () => {
    api.post.mockResolvedValue({
      data: { data: { token: fakeToken({ sub: 2, name: 'Ivy Inspector', email: 'i@example.com', role: 'inspector' }) } },
    })
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), ' i@example.com ')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'i@example.com', password: 'correct-horse' })
    expect(localStorage.getItem('app_token')).toBeTruthy()
  })

  it('shows a clear message for wrong credentials', async () => {
    api.post.mockRejectedValue({ response: { status: 401, data: { code: 'INVALID_CREDENTIALS' } } })
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), 'i@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(localStorage.getItem('app_token')).toBeNull()
  })

  it('shows a connection message when the server is unreachable', async () => {
    api.post.mockRejectedValue(new Error('Network Error'))
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), 'i@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'some-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
  })

  it('toggles password visibility', async () => {
    renderLogin()
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
  })

  it('redirects an already signed-in user away from the login page', async () => {
    localStorage.setItem('app_token', fakeToken({ sub: 1, name: 'A', email: 'a@example.com', role: 'admin' }))
    renderLogin()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument())
  })
})
