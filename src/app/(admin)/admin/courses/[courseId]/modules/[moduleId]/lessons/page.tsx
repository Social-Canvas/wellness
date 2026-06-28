import Link from "next/link"
import { notFound } from "next/navigation"

import { getCourse } from "@/features/courses/services/courses.service"
import { LessonsTable } from "@/features/lessons/components"
import { listLessons } from "@/features/lessons/services/lessons.service"
import { getModule } from "@/features/modules/services/modules.service"

interface AdminModuleLessonsPageProps {
  params: Promise<{ courseId: string; moduleId: string }>
}

export default async function AdminModuleLessonsPage({
  params,
}: AdminModuleLessonsPageProps) {
  const { courseId, moduleId } = await params

  const [courseResult, moduleResult, lessonsResult] = await Promise.all([
    getCourse(courseId),
    getModule(moduleId),
    listLessons(moduleId),
  ])

  if (!courseResult.success) {
    if (courseResult.error.code === "not_found") {
      notFound()
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">Lessons</h2>
          <p className="mt-1 text-sm text-ink-soft">Manage lessons for this module.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{courseResult.error.message}</p>
        </div>
      </div>
    )
  }

  if (!moduleResult.success) {
    if (moduleResult.error.code === "not_found") {
      notFound()
    }

    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-ink-soft">
            <Link href="/admin/courses" className="font-semibold text-blue hover:text-blue-deep">
              Courses
            </Link>
            <span className="mx-1.5">·</span>
            <Link
              href={`/admin/courses/${courseId}/modules`}
              className="font-semibold text-blue hover:text-blue-deep"
            >
              Modules
            </Link>
          </p>
          <h2 className="mt-2 font-display text-[28px] font-medium text-ink">
            {courseResult.data.title}
          </h2>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{moduleResult.error.message}</p>
        </div>
      </div>
    )
  }

  if (moduleResult.data.course_id !== courseId) {
    notFound()
  }

  if (!lessonsResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-ink-soft">
            <Link href="/admin/courses" className="font-semibold text-blue hover:text-blue-deep">
              Courses
            </Link>
            <span className="mx-1.5">·</span>
            <Link
              href={`/admin/courses/${courseId}/modules`}
              className="font-semibold text-blue hover:text-blue-deep"
            >
              Modules
            </Link>
          </p>
          <h2 className="mt-2 font-display text-[28px] font-medium text-ink">
            {moduleResult.data.title}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Lessons in {courseResult.data.title}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{lessonsResult.error.message}</p>
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
          <span className="mx-1.5">·</span>
          <Link
            href={`/admin/courses/${courseId}/modules`}
            className="font-semibold text-blue hover:text-blue-deep"
          >
            Modules
          </Link>
        </p>
        <h2 className="mt-2 font-display text-[28px] font-medium text-ink">
          {moduleResult.data.title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Lessons in {courseResult.data.title}
        </p>
      </div>

      <LessonsTable
        courseId={courseId}
        moduleId={moduleId}
        lessons={lessonsResult.data}
      />
    </div>
  )
}
