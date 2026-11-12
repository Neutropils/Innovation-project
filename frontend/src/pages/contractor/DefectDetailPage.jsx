import { useParams } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import PagePlaceholder from '@/components/PagePlaceholder'

// Owner: Jerald
// Features: F03.4-F03.10 defect details, progress, evidence, e-sign, inspector verification, history
// Wireframe: design/screens.md "Defect detail"
// One page for both roles: the contractor does the work, the inspector or admin verifies it.
export default function DefectDetailPage() {
  const { id } = useParams()
  return (
    <PagePlaceholder title={`Defect ${id}`} Icon={ClipboardList} owner="Jerald" features="details, progress, evidence, sign-off, verification">
      <p>Uses GET /api/defects/{id} (Si Qi) and POST /api/defects/{id}/acknowledge, /updates, /signoff, /verify.</p>
    </PagePlaceholder>
  )
}
