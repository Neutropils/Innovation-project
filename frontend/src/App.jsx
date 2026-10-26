import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks'
import { getRoleHome } from './router/routes'

// Guards
import ProtectedRoute from './router/ProtectedRoute'
import RoleRoute from './router/RoleRoute'

// Shell
import AppLayout from './layouts/AppLayout'

// Error pages (public - no shell)
import ForbiddenPage from './pages/ForbiddenPage'
import NotFoundPage from './pages/NotFoundPage'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Shared
import DashboardPage from './pages/dashboard/DashboardPage'

// Admin
import AdminPage from './pages/admin/AdminPage'

// Redirects authenticated users to their role's home page
function RoleHomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getRoleHome(user.role)} replace />
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403"   element={<ForbiddenPage />} />
      <Route path="/404"   element={<NotFoundPage />} />

      {/* ── Authenticated shell ─────────────────────────────────────────────── */}
      {/* ProtectedRoute redirects to /login if no valid JWT.                    */}
      {/* AppLayout renders the sidebar and <Outlet /> for page content.         */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>

          {/* Root: redirect to the logged-in user's role home */}
          <Route index element={<RoleHomeRedirect />} />

          {/* ── All roles ──────────────────────────────────────────────────── */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* ── Admin only ─────────────────────────────────────────────────── */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

        </Route>
      </Route>

      {/* ── Catch-all ──────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
