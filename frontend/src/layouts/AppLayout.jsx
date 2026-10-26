import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Lightbulb, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks'
import { NAV_ROUTES } from '@/router/routes'
import { Button } from '@/components/ui/button'

const ROLE_META = {
  admin:  { label: 'Admin',  badge: 'bg-blue-100 text-blue-700' },
  member: { label: 'Member', badge: 'bg-slate-100 text-slate-700' },
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const visibleRoutes = NAV_ROUTES.filter(r => r.roles.includes(user?.role))
  const roleMeta = ROLE_META[user?.role] ?? { label: user?.role ?? '', badge: 'bg-gray-100 text-gray-700' }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 px-5 py-[18px] bg-[#1B2336]">
          <Lightbulb className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span className="text-sm font-semibold tracking-wide text-white">Innovation Project</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {visibleRoutes.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-border space-y-2">
          <div className="px-3 py-1">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${roleMeta.badge}`}>
              {roleMeta.label}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
