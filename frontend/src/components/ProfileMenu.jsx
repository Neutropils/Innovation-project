import { useEffect, useRef, useState } from 'react'
import { ChevronsUpDown, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

// Profile button that opens a small menu with the account details and Sign out, so
// signing out takes two deliberate taps instead of one stray one.
//   compact  avatar only (phone top bar), menu opens below
//   full     avatar + name + email (desktop sidebar footer), menu opens above

function initialsOf(name) {
  return String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
}

export default function ProfileMenu({ user, roleMeta, onSignOut, variant = 'compact' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const avatar = (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-2 ring-card">
      {initialsOf(user?.name)}
    </span>
  )

  return (
    <div ref={ref} className={cn('relative', variant === 'full' && 'w-full')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile menu"
        className={cn(
          'flex items-center gap-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          variant === 'full' ? 'w-full px-2 py-2 text-left hover:bg-muted' : 'p-1 hover:bg-muted'
        )}
      >
        {avatar}
        {variant === 'full' && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{user?.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{roleMeta?.label}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Profile"
          className={cn(
            'absolute z-50 w-60 rounded-xl border border-border bg-card p-1.5 text-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95',
            variant === 'full' ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2'
          )}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            {roleMeta && (
              <span className={cn('mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium', roleMeta.badge)}>{roleMeta.label}</span>
            )}
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onSignOut() }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:outline-none"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
