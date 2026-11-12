import { History } from 'lucide-react'
import PagePlaceholder from '@/components/PagePlaceholder'

// Owner: Kandha
// Features: F01.11 history, F01.12 inspection report, F05.3 inspection export
// Wireframe: design/screens.md "Inspection history and report"
export default function InspectionHistoryPage() {
  return (
    <PagePlaceholder title="Inspections" Icon={History} owner="Kandha" features="history, report, CSV export">
      <p>Uses GET /api/inspections?liftId=&amp;from=&amp;to= and /api/inspections/export.</p>
    </PagePlaceholder>
  )
}
