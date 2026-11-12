import { Inbox } from 'lucide-react'
import PagePlaceholder from '@/components/PagePlaceholder'

// Owner: Jerald
// Features: F03.2 assigned-defect inbox, F03.3 acknowledge - contractor home
// Wireframe: design/screens.md "Inbox"
// Each card links to /defects/<id>.
export default function InboxPage() {
  return (
    <PagePlaceholder title="Inbox" Icon={Inbox} owner="Jerald" features="your company's defects, acknowledge">
      <p>Uses GET /api/inbox?status=.</p>
    </PagePlaceholder>
  )
}
