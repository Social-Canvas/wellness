import Link from "next/link"
import { notFound } from "next/navigation"

import { getCourse } from "@/features/courses/services/courses.service"
import { ModulesTable } from "@/features/modules/components"
import { listModules } from "@/features/modules/services/modules.service"

interface AdminCourseModulesPageProps {
  params: Promise<{ courseId: string }>
}

export default async function AdminCourseModulesPage({
  params,
}: AdminCourseModulesPageProps) {
  const { courseId } = await params

  const [courseResult, modulesResult] = await Promise.all([
    getCourse(courseId),
    listModules(courseId),
  ])

  if (!courseResult.success) {
    if (courseResult.error.code === "not_found") {
      notFound()
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">Modules</h2>
          <p className="mt-1 text-sm text-ink-soft">Manage modules for this course.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{courseResult.error.message}</p>
        </div>
      </div>
    )
  }

  if (!modulesResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-ink-soft">
            <Link href="/admin/courses" className="font-semibold text-blue hover:text-blue-deep">
              Courses
            </Link>
          </p>
          <h2 className="mt-2 font-display text-[28px] font-medium text-ink">
            {courseResult.data.title}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Manage modules for this course.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{modulesResult.error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-ink-soft">
          <Link href="/admin/courses" className="font-semibold text-blue hover:text-blue-deep">
            Courses
          </Link>
        </p>
        <h2 className="mt-2 font-display text-[28px] font-medium text-ink">
          {courseResult.data.title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Manage modules and lesson groupings for this course.
        </p>
      </div>

      <ModulesTable courseId={courseId} modules={modulesResult.data} />
    </div>
  )
}
