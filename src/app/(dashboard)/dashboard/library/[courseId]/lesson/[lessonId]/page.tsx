import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { LessonPlayerView, LibraryPageHeader } from "@/features/content/components"
import {
  getAccessibleCourse,
  getAccessibleLesson,
} from "@/features/content/services/content.service"
import { buildLessonNavigation } from "@/features/content/utils/lesson-navigation"

interface LessonLibraryPageProps {
  params: Promise<{ courseId: string; lessonId: string }>
  searchParams: Promise<{ preview?: string | string[] }>
}

function isPreviewRequested(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) {
    return value.includes("1")
  }

  return value === "1"
}

export async function generateMetadata({
  params,
  searchParams,
}: LessonLibraryPageProps): Promise<Metadata> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return { title: "Lesson" }
  }

  const { courseId, lessonId } = await params
  const { preview } = await searchParams
  const result = await getAccessibleLesson(profileResult.data.id, courseId, lessonId, {
    preview: {
      requested: isPreviewRequested(preview),
      role: profileResult.data.role,
    },
  })

  if (!result.success) {
    return { title: "Lesson" }
  }

  return {
    title: result.data.title,
    description: result.data.description ?? undefined,
  }
}

export default async function LessonLibraryPage({
  params,
  searchParams,
}: LessonLibraryPageProps) {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const { courseId, lessonId } = await params
  const { preview } = await searchParams
  const previewRequested = isPreviewRequested(preview)
  const previewContext = {
    preview: { requested: previewRequested, role: profileResult.data.role },
  }

  const [lessonResult, courseResult] = await Promise.all([
    getAccessibleLesson(profileResult.data.id, courseId, lessonId, previewContext),
    getAccessibleCourse(profileResult.data.id, courseId, previewContext),
  ])

  if (!lessonResult.success) {
    if (lessonResult.error.code === "not_found") {
      notFound()
    }

    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[
            { label: "Library", href: "/dashboard/library" },
            { label: "Course", href: `/dashboard/library/${courseId}` },
            { label: "Lesson" },
          ]}
          title="Lesson"
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{lessonResult.error.message}</p>
        </div>
      </div>
    )
  }

  if (!courseResult.success) {
    if (courseResult.error.code === "not_found") {
      notFound()
    }

    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[
            { label: "Library", href: "/dashboard/library" },
            { label: "Course", href: `/dashboard/library/${courseId}` },
            { label: "Lesson" },
          ]}
          title="Lesson"
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{courseResult.error.message}</p>
        </div>
      </div>
    )
  }

  const lesson = lessonResult.data
  const course = courseResult.data
  // Course entitlement was resolved once in getAccessibleCourse; outline modules
  // reuse that result — no per-lesson entitlement loop.
  const navigation = buildLessonNavigation(course.modules, lesson.id)

  return (
    <LessonPlayerView
      lesson={lesson}
      modules={course.modules}
      navigation={navigation}
    />
  )
}
