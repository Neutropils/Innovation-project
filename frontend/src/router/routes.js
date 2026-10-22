import { LayoutDashboard, ShieldCheck } from 'lucide-react'

// NAV_ROUTES drives the sidebar nav in AppLayout.
// To add a new route: add an entry here, then add the <Route> in App.jsx.
export const NAV_ROUTES = [
  // ── All roles ────────────────────────────────────────────────────────────────
  {
    path: '/dashboard',
    label: 'Dashboard',
    Icon: LayoutDashboard,
    roles: ['admin', 'member'],
  },

  // ── Admin ────────────────────────────────────────────────────────────────────
  {
    path: '/admin',
    label: 'Admin',
    Icon: ShieldCheck,
    roles: ['admin'],
  },
]

// Default landing page per role after login
export const ROLE_HOMES = {
  admin:  '/dashboard',
  member: '/dashboard',
}

export function getRoleHome(role) {
  return ROLE_HOMES[role] ?? '/login'
}
