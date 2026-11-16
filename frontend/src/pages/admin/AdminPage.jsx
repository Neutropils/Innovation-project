import { useSearchParams } from 'react-router-dom'
import { Building2, HardHat, ShieldCheck, Upload, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHero, { PageShell } from '@/components/PageHero'
import DemoScenarioBar from '@/prototype/DemoScenarioBar'
import LiftsTab from './LiftsTab'
import ContractorsTab from './ContractorsTab'
import UsersTab from './UsersTab'
import ImportTab from './ImportTab'

// Owner: Kwan
// Features: F04.1-F04.5 lift, contractor and user records, F05.1/F05.2/F05.5 bulk lift import
// Wireframe: design/screens.md "Admin" - only reachable by the admin role (see RoleRoute in App.jsx)
//
// One page with four tabs instead of four pages ("fewer pages" in the 12b brief).
// The open tab lives in the URL (?tab=) so the back button and links from other pages work.

const TABS = [
  { id: 'lifts', label: 'Lifts', Icon: Building2, Panel: LiftsTab },
  { id: 'contractors', label: 'Contractors', Icon: HardHat, Panel: ContractorsTab },
  { id: 'users', label: 'Users', Icon: Users, Panel: UsersTab },
  { id: 'import', label: 'Import', Icon: Upload, Panel: ImportTab },
]

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === searchParams.get('tab')) ?? TABS[0]

  // Opening a tab drops the other tab's search (?q=)
  const openTab = (id) => setSearchParams(id === TABS[0].id ? {} : { tab: id })

  return (
    <PageShell>
      <PageHero Icon={ShieldCheck} eyebrow="EMS admin" title="Admin">
        <p>Lift register, lift companies, user accounts and bulk import.</p>
      </PageHero>

      <div role="tablist" aria-label="Admin sections" className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {TABS.map(({ id, label, Icon }) => {
          const selected = id === tab.id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={selected}
              aria-controls="admin-panel"
              onClick={() => openTab(id)}
              className={cn(
                'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id="admin-panel" aria-labelledby={`tab-${tab.id}`}>
        <tab.Panel onOpenTab={openTab} />
      </div>

      {/* Prototype-only demo controls, kept out of the way at the bottom */}
      <DemoScenarioBar className="bg-card/70 backdrop-blur" />
    </PageShell>
  )
}
