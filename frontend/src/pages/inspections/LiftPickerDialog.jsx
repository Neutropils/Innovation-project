import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Search, X } from 'lucide-react'
import api from '@/api'
import { cn } from '@/lib/utils'
import { FIELD } from './inspectionDisplay'

// Owner: Kandha
// "New inspection": search the lift register (GET /api/lifts?q=, Kwan's endpoint), then go to
// /inspections/new?liftId=<id> - the contract with the Lifts page.

const address = (l) => [l.block && `Blk ${l.block}`, l.street, l.town].filter(Boolean).join(', ')
const contractorOf = (l) => l.contractorName ?? l.contractor?.name ?? ''

// Every typed word must appear in the lift code, block, street, town or contractor
function matches(lift, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const hay = [lift.liftCode, lift.liftName, lift.block, lift.street, lift.town, lift.postalCode, contractorOf(lift)].join(' ').toLowerCase()
  return words.every((w) => hay.includes(w))
}

export default function LiftPickerDialog({ onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ status: 'loading', lifts: [] })

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Search runs on the server (debounced); the same words are re-checked here so the list
  // is right even if the server ignores ?q=
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, status: 'loading' }))
      api.get('/lifts', { params: query.trim() ? { q: query.trim() } : {} })
        .then((res) => { if (!cancelled) setState({ status: 'ready', lifts: res.data.data ?? [] }) })
        .catch(() => { if (!cancelled) setState({ status: 'error', lifts: [] }) })
    }, query ? 250 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  const lifts = state.lifts.filter((l) => l.isActive !== false && matches(l, query))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="lift-picker-title" className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="lift-picker-title" className="text-base font-semibold text-foreground">Which lift are you checking?</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search lifts"
              placeholder="Search lift ID, block or street"
              className={cn(FIELD, 'pl-9 [&::-webkit-search-cancel-button]:hidden')}
            />
          </div>
        </div>

        <div className="min-h-[8rem] flex-1 overflow-y-auto px-4 py-3">
          {state.status === 'loading' && <p role="status" className="py-6 text-center text-sm text-muted-foreground">Searching…</p>}
          {state.status === 'error' && <p role="alert" className="py-6 text-center text-sm text-destructive">Couldn’t load the lifts. Close this and try again.</p>}
          {state.status === 'ready' && lifts.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{query ? `No lifts match “${query.trim()}”.` : 'No lifts in the register yet.'}</p>
          )}
          {state.status === 'ready' && lifts.length > 0 && (
            <ul className="space-y-2">
              {lifts.map((lift) => (
                <li key={lift.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/inspections/new?liftId=${lift.id}`)}
                    className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:text-accent">
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-medium text-foreground/80">{lift.liftCode}</span>
                      <span className="block truncate text-sm text-foreground">{address(lift)}</span>
                      {contractorOf(lift) && <span className="block truncate text-xs text-muted-foreground">{contractorOf(lift)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
