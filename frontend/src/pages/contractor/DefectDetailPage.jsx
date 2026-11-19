import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks'
import DefectRecordPanel from '@/pages/defects/DefectRecordPanel'
import ContractorDefectView, { DefectActions } from './ContractorDefectView'
import { useDefects } from './defectStore'

// Owner: Jerald
// Features: F03.4-F03.10 defect details, progress, evidence, e-sign, inspector verification, history
// Wireframe: design/screens.md "Defect detail"
// One page for both roles: the contractor does the work, the inspector or admin verifies it.
// - Contractors get Jerald's Figma view (ContractorDefectView).
// - Inspectors and admins get Si Qi's DefectRecordPanel (summary, admin reassign F02.4,
//   history F02.10) with Jerald's verification actions underneath (DefectActions).
// Both read the same shared prototype defects, so the numbers and statuses match.
export default function DefectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const defects = useDefects()

  if (user?.role === 'contractor') return <ContractorDefectView />

  // Reload Si Qi's panel when an approve/reject changes the status, so its badge stays in step.
  const status = defects.find((d) => String(d.id) === id)?.status ?? 'unknown'

  return (
    <>
      <DefectRecordPanel key={status} defectId={id} />
      <DefectActions id={id} />
    </>
  )
}
