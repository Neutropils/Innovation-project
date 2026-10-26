import { LayoutDashboard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// Owner: <Teammate name>
// Features: <what this page shows>
export default function DashboardPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Landing page for all signed-in users</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Implementation placeholder.</p>
        </CardContent>
      </Card>
    </div>
  )
}
