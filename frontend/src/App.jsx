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

// Kwan
import LiftsPage from './pages/lifts/LiftsPage'
import AdminPage from './pages/admin/AdminPage'

// Kandha
import InspectionPage from './pages/inspections/InspectionPage'
import InspectionHistoryPage from './pages/inspections/InspectionHistoryPage'

// Si Qi
import DefectsPage from './pages/defects/DefectsPage'
import OverviewPage from './pages/overview/OverviewPage'

// Jerald
import InboxPage from './pages/contractor/InboxPage'
import DefectDetailPage from './pages/contractor/DefectDetailPage'

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

          {/* Every page in design/screens.md is routed below (skeleton PR).   */}
          {/* Build inside your own page file - no need to edit this one.     */}

          {/* ── Inspector only ─────────────────────────────────────────────── */}
          <Route element={<RoleRoute roles={['inspector']} />}>
            <Route path="/inspections/new" element={<InspectionPage />} />
            <Route path="/inspections/:id" element={<InspectionPage />} />
          </Route>

          {/* ── Inspector and admin ────────────────────────────────────────── */}
          <Route element={<RoleRoute roles={['inspector', 'admin']} />}>
            <Route path="/lifts" element={<LiftsPage />} />
            <Route path="/inspections" element={<InspectionHistoryPage />} />
            <Route path="/defects" element={<DefectsPage />} />
          </Route>

          {/* ── Inspector, admin and contractor (own company only) ─────────── */}
          <Route element={<RoleRoute roles={['inspector', 'admin', 'contractor']} />}>
            <Route path="/defects/:id" element={<DefectDetailPage />} />
          </Route>

          {/* ── Contractor only ────────────────────────────────────────────── */}
          <Route element={<RoleRoute roles={['contractor']} />}>
            <Route path="/inbox" element={<InboxPage />} />
          </Route>

          {/* ── Admin only ─────────────────────────────────────────────────── */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

        </Route>
      </Route>

      {/* ── Catch-all ──────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
