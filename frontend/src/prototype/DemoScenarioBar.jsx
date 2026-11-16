import { useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROTOTYPE } from './mockApi'
import { SCENARIOS, getScenario, setScenario } from './scenario'

const LABELS = { normal: 'Demo data', empty: 'Empty', offline: 'Offline', error: 'Server error' }

// Current demo scenario; re-renders when DemoScenarioBar switches it.
// Put it in a data-fetching effect's dependencies to refetch on change.
export function useScenario() {
  const [scenario, set] = useState(getScenario)
  useEffect(() => {
    const onChange = () => set(getScenario())
    window.addEventListener('elev8-scenario', onChange)
    return () => window.removeEventListener('elev8-scenario', onChange)
  }, [])
  return scenario
}

// Prototype-only switch to show a page with demo data, with no data, or failing to load.
export default function DemoScenarioBar({ className }) {
  const scenario = useScenario()
  if (!PROTOTYPE) return null
  return (
    <div
      role="group"
      aria-label="Prototype data"
      className={cn('flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-foreground/20 px-3 py-2 text-xs', className)}
    >
      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
        Prototype
      </span>
      {SCENARIOS.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={scenario === s}
          onClick={() => setScenario(s)}
          className={cn(
            'rounded-full border px-2.5 py-1 font-medium transition-colors',
            scenario === s
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  )
}
