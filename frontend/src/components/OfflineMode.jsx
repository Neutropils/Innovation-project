import { useCallback, useEffect, useState } from 'react'
import { Loader2, RotateCw, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// Owner: Si Qi
// Offline mode for read-only pages: every successful load is saved for this browser tab,
// so when the connection drops the page keeps showing the last copy with a banner,
// instead of a "couldn't load" error. It reloads by itself when the connection comes back.
// Server errors (a response with an error status) still show the normal error state.

const PREFIX = 'elev8_offline:'

// No response at all (Axios ERR_NETWORK) or the browser says it's offline.
export function isOfflineError(err) {
  return err?.code === 'ERR_NETWORK' || (typeof navigator !== 'undefined' && navigator.onLine === false)
}

// sessionStorage, not localStorage: saved copies go away when the tab closes.
export function readSaved(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveCopy(key, data) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }))
  } catch {
    // Storage full or blocked - offline mode just has nothing saved for this view.
  }
}

// state.status: loading | ready | offline (no saved copy) | error
// state.savedAt: set when `data` is a saved copy shown because we're offline.
export function useOfflineLoad(cacheKey, fetcher) {
  const [state, setState] = useState({ status: 'loading', data: null, savedAt: null, retrying: false, key: cacheKey })

  const load = useCallback(async () => {
    // Retrying while offline keeps the saved copy on screen instead of flashing a skeleton.
    setState((s) =>
      s.key === cacheKey && (s.savedAt || s.status === 'offline')
        ? { ...s, retrying: true }
        : { status: 'loading', data: null, savedAt: null, retrying: false, key: cacheKey }
    )
    try {
      const data = await fetcher()
      saveCopy(cacheKey, data)
      setState({ status: 'ready', data, savedAt: null, retrying: false, key: cacheKey })
    } catch (err) {
      if (!isOfflineError(err)) {
        setState({ status: 'error', data: null, savedAt: null, retrying: false, key: cacheKey })
        return
      }
      const saved = readSaved(cacheKey)
      setState(
        saved
          ? { status: 'ready', data: saved.data, savedAt: saved.savedAt, retrying: false, key: cacheKey }
          : { status: 'offline', data: null, savedAt: null, retrying: false, key: cacheKey }
      )
    }
  }, [cacheKey, fetcher])

  useEffect(() => {
    // Connection back: refresh. Connection lost: flag what's on screen as a saved copy.
    const goOnline = () => load()
    const goOffline = () =>
      setState((s) => (s.status === 'ready' && !s.savedAt ? { ...s, savedAt: readSaved(cacheKey)?.savedAt ?? Date.now() } : s))
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [load, cacheKey])

  return [state, load]
}

export function savedAtText(savedAt) {
  const d = new Date(savedAt)
  const sameDay = d.toDateString() === new Date().toDateString()
  const time = d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })
  return sameDay ? `today at ${time}` : `${d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })} at ${time}`
}

function RetryButton({ onRetry, retrying, className }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {retrying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCw className="h-4 w-4" aria-hidden="true" />}
      {retrying ? 'Checking…' : 'Try again'}
    </button>
  )
}

// Shown above a saved copy while offline.
export function OfflineBanner({ savedAt, what = 'data', onRetry, retrying }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/20">
        <WifiOff className="h-4 w-4 text-accent" aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold text-foreground">You’re offline</span>
        <span className="text-muted-foreground">
          Showing {what} saved {savedAtText(savedAt)}. It refreshes when you’re back online.
        </span>
      </p>
      <RetryButton onRetry={onRetry} retrying={retrying} />
    </div>
  )
}

// Shown when offline and nothing for this view was saved yet.
export function OfflineState({ title = 'You’re offline', message, onRetry, retrying, className }) {
  return (
    <div role="status" className={cn('flex flex-col items-center rounded-2xl border border-dashed border-accent/50 bg-accent/5 px-6 py-10 text-center', className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15">
        <WifiOff className="h-5 w-5 text-accent" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {message ?? 'This view hasn’t been opened online yet, so nothing is saved on this device. It loads as soon as you reconnect.'}
      </p>
      <RetryButton onRetry={onRetry} retrying={retrying} className="mt-4" />
    </div>
  )
}
