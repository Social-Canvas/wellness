import { listCourses } from "@/features/courses/services/courses.service"
import { CoursesTable } from "@/features/courses/components"

export default async function AdminCoursesPage() {
  const result = await listCourses()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">Courses</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Manage course catalog and publishing settings.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Courses</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Manage course catalog and publishing settings.
        </p>
      </div>

      <CoursesTable courses={result.data} />
    </div>
  )
}
