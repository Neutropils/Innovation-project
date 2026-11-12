import { Wrench } from 'lucide-react'
import PagePlaceholder from '@/components/PagePlaceholder'

// Owner: Si Qi
// Features: F02.3 grouped by contractor, F02.8 filters, F02.9 overdue, F05.4 export
// Wireframe: design/screens.md "Defects"
// Each row links to /defects/<id> (Jerald's detail page).
export default function DefectsPage() {
  return (
    <PagePlaceholder title="Defects" Icon={Wrench} owner="Si Qi" features="defects by contractor, filters, overdue, export">
      <p>Uses GET /api/defects?contractorId=&amp;status=&amp;severity=&amp;overdue=&amp;liftId=.</p>
    </PagePlaceholder>
  )
}
