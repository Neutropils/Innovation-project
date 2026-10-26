import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import NotFoundPage from '@/pages/NotFoundPage'
import { cn } from '@/lib'

describe('NotFoundPage', () => {
  it('offers a link back to login when signed out', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <NotFoundPage />
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to login' })).toBeInTheDocument()
  })
})

describe('cn', () => {
  it('lets later Tailwind classes override earlier ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
