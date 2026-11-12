import { Building2 } from 'lucide-react'
import PagePlaceholder from '@/components/PagePlaceholder'

// Owner: Kwan
// Features: F01.1 lift search, F01.2 lift details, F01.13 map link (P2) - inspector home
// Wireframe: design/screens.md "Lifts"
//
// CONTRACT with Kandha: "Start inspection" navigates to /inspections/new?liftId=<id>.
// Kandha's page creates the draft, so this page never calls the inspections API.
export default function LiftsPage() {
  return (
    <PagePlaceholder title="Lifts" Icon={Building2} owner="Kwan" features="search lifts, start an inspection, view history">
      <p>Uses GET /api/lifts?q=. Start inspection links to /inspections/new?liftId=ID.</p>
    </PagePlaceholder>
  )
}
