import { Building2, History, Inbox, LayoutDashboard, ShieldCheck, Wrench } from 'lucide-react'

// NAV_ROUTES drives the sidebar (desktop) and bottom nav (phone) in AppLayout.
// Every page in design/screens.md is already listed (skeleton PR), so you should not
// need to edit this file. Detail pages (/inspections/:id, /defects/:id) are reached
// from a list, so they have a <Route> in App.jsx but no nav entry.
export const NAV_ROUTES = [
  // ── Kwan ─────────────────────────────────────────────────────────────────────
  { path: '/lifts',       label: 'Lifts',       Icon: Building2,       roles: ['inspector', 'admin'] },

  // ── Kandha ───────────────────────────────────────────────────────────────────
  { path: '/inspections', label: 'Inspections', Icon: History,         roles: ['inspector', 'admin'] },

  // ── Si Qi ────────────────────────────────────────────────────────────────────
  { path: '/overview',    label: 'Overview',    Icon: LayoutDashboard, roles: ['admin'] },
  { path: '/defects',     label: 'Defects',     Icon: Wrench,          roles: ['inspector', 'admin'] },

  // ── Jerald ───────────────────────────────────────────────────────────────────
  { path: '/inbox',       label: 'Inbox',       Icon: Inbox,           roles: ['contractor'] },

  // ── Kwan: admin tools ────────────────────────────────────────────────────────
  { path: '/admin',       label: 'Admin',       Icon: ShieldCheck,     roles: ['admin'] },

  // ── Members (self sign-up, no part in the spot-check workflow) ───────────────
  { path: '/dashboard',   label: 'Dashboard',   Icon: LayoutDashboard, roles: ['member'] },
]

// Default landing page per role after login (design/screens.md "Home for")
export const ROLE_HOMES = {
  admin:      '/overview',
  inspector:  '/lifts',
  contractor: '/inbox',
  member:     '/dashboard',
}

export function getRoleHome(role) {
  return ROLE_HOMES[role] ?? '/login'
}
