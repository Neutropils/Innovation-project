import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { NAV_ROUTES } from '@/router/routes'
import LiftLogo from '@/components/LiftLogo'
import ProfileMenu from '@/components/ProfileMenu'

const ROLE_META = {
  admin:      { label: 'Admin',      badge: 'bg-primary/10 text-primary' },
  inspector:  { label: 'Inspector',  badge: 'bg-secondary/30 text-foreground' },
  contractor: { label: 'Contractor', badge: 'bg-accent/15 text-accent' },
  member:     { label: 'Member',     badge: 'bg-muted text-muted-foreground' },
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const visibleRoutes = NAV_ROUTES.filter(r => r.roles.includes(user?.role))
  const roleMeta = ROLE_META[user?.role] ?? { label: user?.role ?? '', badge: 'bg-muted text-muted-foreground' }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row bg-background overflow-hidden">
      {/* ── Mobile top bar (below md) ────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border bg-card text-foreground">
        <div className="flex min-w-0 items-center gap-2.5">
          <LiftLogo className="h-8 w-8 flex-shrink-0" title="" />
          <span className="text-base font-bold tracking-tight">Elev<span className="text-accent">8</span></span>
        </div>
        {/* Sign out lives in the profile menu so it can't be tapped by mistake */}
        <ProfileMenu user={user} roleMeta={roleMeta} onSignOut={handleLogout} />
      </header>

      {/* ── Sidebar (md and up) ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-border bg-card">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <LiftLogo className="h-8 w-8 flex-shrink-0" title="" />
          <span className="text-base font-bold tracking-tight text-foreground">Elev<span className="text-accent">8</span></span>
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
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-border">
          <ProfileMenu user={user} roleMeta={roleMeta} onSignOut={handleLogout} variant="full" />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav (below md) ─────────────────────────────────────── */}
      <nav className="md:hidden flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        {visibleRoutes.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `relative flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] text-xs transition-colors ${
                isActive ? 'font-semibold text-primary dark:text-accent' : 'font-medium text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary dark:bg-accent" aria-hidden="true" />}
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-primary/15 dark:bg-accent/15' : ''}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
