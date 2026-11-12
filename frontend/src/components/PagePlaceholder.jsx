import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// Shared - temporary body for pages created by the skeleton PR. Each owner replaces
// their page's <PagePlaceholder> with the real screen (wireframes: design/screens.md).
export default function PagePlaceholder({ title, Icon, owner, features, children }) {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />}
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Not built yet</CardTitle>
          <CardDescription>
            Owner: {owner} - {features}
          </CardDescription>
        </CardHeader>
        {children && <CardContent className="text-sm text-muted-foreground space-y-2">{children}</CardContent>}
      </Card>
    </div>
  )
}
