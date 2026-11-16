import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import App from '@/App'
import api from '@/api'
import { registerRequest } from '@/prototype/registerData'

// Shared by Kwan's page tests. The test file mocks '@/api'; these helpers answer its calls
// from the prototype register (no delay), or make them fail.

const ACCOUNTS = {
  inspector: { sub: 1, name: 'Ivy Tan', email: 'inspector@demo.ems', role: 'inspector', contractorId: null },
  admin: { sub: 3, name: 'Aisha Rahman', email: 'admin@demo.ems', role: 'admin', contractorId: null },
}

export function renderAt(path, role = 'admin') {
  localStorage.setItem('app_token', `x.${btoa(JSON.stringify(ACCOUNTS[role]))}.x`)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  )
}

function answer(method, url, body, empty) {
  const config = { headers: { Authorization: `Bearer ${localStorage.getItem('app_token')}` } }
  const res = registerRequest(config, { method, path: url, body, empty })
  if (!res) return Promise.resolve({ data: { success: true, data: [] } })
  if (res.status >= 400) {
    return Promise.reject(Object.assign(new Error(res.body.message), { response: { status: res.status, data: res.body } }))
  }
  return Promise.resolve({ data: res.body })
}

export function serveDemoData({ empty = false } = {}) {
  api.get.mockImplementation((url) => answer('get', url, undefined, empty))
  api.post.mockImplementation((url, body) => answer('post', url, body))
  api.patch.mockImplementation((url, body) => answer('patch', url, body))
}

// What Axios throws when there is no connection (no response at all).
const offlineError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })
const serverError = () =>
  Object.assign(new Error('Server error'), { response: { status: 500, data: { success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' } } })

export const failReads = (kind) => api.get.mockImplementation(() => Promise.reject(kind === 'offline' ? offlineError() : serverError()))
export function failSaves(kind) {
  const fail = () => Promise.reject(kind === 'offline' ? offlineError() : serverError())
  api.post.mockImplementation(fail)
  api.patch.mockImplementation(fail)
}
