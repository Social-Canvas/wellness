import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  LibraryLessonDetailView,
  LibraryPageHeader,
} from "@/features/content/components"
import { getAccessibleLesson } from "@/features/content/services/content.service"

interface LessonLibraryPageProps {
  params: Promise<{ courseId: string; lessonId: string }>
}

export async function generateMetadata({
  params,
}: LessonLibraryPageProps): Promise<Metadata> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return { title: "Lesson" }
  }

  const { courseId, lessonId } = await params
  const result = await getAccessibleLesson(profileResult.data.id, courseId, lessonId)

  if (!result.success) {
    return { title: "Lesson" }
  }

  return {
    title: result.data.title,
    description: result.data.description ?? undefined,
  }
}

export default async function LessonLibraryPage({ params }: LessonLibraryPageProps) {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const { courseId, lessonId } = await params
  const result = await getAccessibleLesson(profileResult.data.id, courseId, lessonId)

  if (!result.success) {
    if (result.error.code === "not_found") {
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
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  const lesson = result.data

  return (
    <div className="mt-9 space-y-6">
      <LibraryPageHeader
        breadcrumb={[
          { label: "Library", href: "/dashboard/library" },
          { label: lesson.course.title, href: `/dashboard/library/${courseId}` },
          { label: lesson.module.title, href: `/dashboard/library/${courseId}` },
          { label: lesson.title },
        ]}
        title={lesson.title}
        description={`${lesson.course.title} · ${lesson.module.title}`}
      />

      <LibraryLessonDetailView lesson={lesson} />
    </div>
  )
}
