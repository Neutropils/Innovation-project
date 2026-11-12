import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Owner: Jerald - photo picker and upload (F01.7, F03.6)
//
// CONTRACT: <PhotoUpload onUploaded={(attachment) => ...} label="Add photo" />
//   onUploaded  called with { id, url } once the photo is stored (POST /api/attachments)
//   label       button text
// Used by Kandha's checklist (defect photos) and Jerald's defect detail (repair evidence).
//
// STUB: renders a disabled button so pages can place it now. Jerald makes it work.
export default function PhotoUpload({ label = 'Add photo' }) {
  return (
    <Button type="button" variant="outline" disabled className="h-11 gap-2" title="Photo upload is not built yet (owner: Jerald)">
      <Camera className="w-4 h-4" aria-hidden="true" />
      {label}
    </Button>
  )
}
