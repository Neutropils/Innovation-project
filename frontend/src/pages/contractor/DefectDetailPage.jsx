import { useParams } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useAuth } from '@/hooks'
import PagePlaceholder from '@/components/PagePlaceholder'
import DefectRecordPanel from '@/pages/defects/DefectRecordPanel'
import ContractorDefectView from './ContractorDefectView'

// Owner: Jerald
// Features: F03.4-F03.10 defect details, progress, evidence, e-sign, inspector verification, history
// Wireframe: design/screens.md "Defect detail"
// One page for both roles: the contractor does the work, the inspector or admin verifies it.
// Contractors get Jerald's Figma view (ContractorDefectView, same sample data as the Inbox).
// Inspectors and admins get Si Qi's DefectRecordPanel (summary, admin reassign F02.4, history F02.10).
// Until both use the same demo data, the two views show different sample defects for the same id.
export default function DefectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()

  if (user?.role === 'contractor') return <ContractorDefectView />

  return (
    <>
      <DefectRecordPanel defectId={id} />
      <PagePlaceholder title="Contractor and verification actions" Icon={ClipboardList} owner="Jerald" features="progress, evidence, sign-off, verification">
        <p>Uses POST /api/defects/{id}/acknowledge, /updates, /signoff, /verify.</p>
      </PagePlaceholder>
    </>
  )
}
