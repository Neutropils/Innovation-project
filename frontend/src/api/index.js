import axios from 'axios'
import { PROTOTYPE, mockAdapter } from '@/prototype/mockApi'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  // Prototype mode answers requests in the browser - no backend needed for demos.
  ...(PROTOTYPE && { adapter: mockAdapter }),
})

// Attach Bearer token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('app_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to /login when the server returns 401 - except for the login request itself,
// where a 401 just means wrong credentials and the form shows the error.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.endsWith('/auth/login')
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('app_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
