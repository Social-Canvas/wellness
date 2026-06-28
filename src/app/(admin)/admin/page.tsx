import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Overview and quick links for platform management.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-medium">
            Admin overview
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-ink-soft">
          <p>
            This is a placeholder for the admin home. Plans, courses, products,
            members, and other management tools will be added in upcoming
            sprints.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
        <p className="font-display text-lg font-medium text-ink">
          No admin data yet
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Use the sidebar to navigate sections as they are implemented.
        </p>
      </div>
    </div>
  )
}
