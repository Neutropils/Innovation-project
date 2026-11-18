import { useParams } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import PagePlaceholder from '@/components/PagePlaceholder'
import DefectRecordPanel from '@/pages/defects/DefectRecordPanel'

// Owner: Jerald
// Features: F03.4-F03.10 defect details, progress, evidence, e-sign, inspector verification, history
// Wireframe: design/screens.md "Defect detail"
// One page for both roles: the contractor does the work, the inspector or admin verifies it.
// Si Qi's DefectRecordPanel (summary, admin reassign F02.4, history F02.10) sits on top.
export default function DefectDetailPage() {
  const { id } = useParams()
  return (
    <>
      <DefectRecordPanel defectId={id} />
      <PagePlaceholder title="Contractor and verification actions" Icon={ClipboardList} owner="Jerald" features="progress, evidence, sign-off, verification">
        <p>Uses POST /api/defects/{id}/acknowledge, /updates, /signoff, /verify.</p>
      </PagePlaceholder>
    </>
  )
}
