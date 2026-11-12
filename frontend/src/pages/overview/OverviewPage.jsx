import { LayoutDashboard } from 'lucide-react'
import PagePlaceholder from '@/components/PagePlaceholder'

// Owner: Si Qi
// Features: F08.1-F08.4 open, overdue and inspection counts, by contractor - admin home
// Wireframe: design/screens.md "Overview"
export default function OverviewPage() {
  return (
    <PagePlaceholder title="Overview" Icon={LayoutDashboard} owner="Si Qi" features="open, overdue and inspection counts">
      <p>Uses GET /api/overview?from=&amp;to=.</p>
    </PagePlaceholder>
  )
}
