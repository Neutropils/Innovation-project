import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'

// Redirects to /login if there is no valid, unexpired JWT in localStorage.
// Used as a layout route - all authenticated pages nest inside this.
export default function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()
  // Remember where the user was going so LoginPage can send them back after sign-in
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
