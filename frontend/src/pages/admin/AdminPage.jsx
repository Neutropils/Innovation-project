import { ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// Owner: <Teammate name>
// Features: <what this page shows> - only reachable by the admin role (see RoleRoute in App.jsx)
export default function AdminPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Administration</CardTitle>
          <CardDescription>Admin-only tools</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Implementation placeholder.</p>
        </CardContent>
      </Card>
    </div>
  )
}
