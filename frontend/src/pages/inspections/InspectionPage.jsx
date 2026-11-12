import { useParams, useSearchParams } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import PagePlaceholder from '@/components/PagePlaceholder'

// Owner: Kandha
// Features: F01.3-F01.10 one-page checklist, Pass/Defect, All Pass, defect details, draft, submit
// Wireframe: design/screens.md "Inspection checklist"
//
// Routes: /inspections/new?liftId=<id>  -> create a draft (POST /api/inspections), then replace the URL with /inspections/<id>
//         /inspections/<id>              -> load and continue the draft
export default function InspectionPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const liftId = searchParams.get('liftId')

  return (
    <PagePlaceholder title="Inspection" Icon={ClipboardCheck} owner="Kandha" features="one-page checklist, defects, draft, submit">
      <p>{id ? `Inspection ${id}` : `New inspection for lift ${liftId ?? '(none chosen)'}`}</p>
    </PagePlaceholder>
  )
}
