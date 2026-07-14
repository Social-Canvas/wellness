import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  LibraryLessonComingSoonView,
  LibraryLessonDetailView,
  LibraryPageHeader,
} from "@/features/content/components"
import { getAccessibleLesson } from "@/features/content/services/content.service"

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

  const result = await getAccessibleLesson(profileResult.data.id, courseId, lessonId, {
    preview: { requested: previewRequested, role: profileResult.data.role },
  })

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
  const isPreview = lesson.preview
  const courseHref = isPreview
    ? `/dashboard/library/${courseId}?preview=1`
    : `/dashboard/library/${courseId}`

  return (
    <div className="mt-9 space-y-6">
      <LibraryPageHeader
        breadcrumb={[
          { label: "Library", href: "/dashboard/library" },
          { label: lesson.course.title, href: courseHref },
          { label: lesson.module.title, href: courseHref },
          { label: lesson.title },
        ]}
        title={lesson.title}
        description={`${lesson.course.title} · ${lesson.module.title}`}
      />

      {isPreview ? (
        <div className="rounded-2xl border border-blue/30 bg-blue-soft/20 px-4 py-3 text-sm text-ink">
          <span className="font-semibold text-blue">Preview mode</span> · Viewing
          unpublished draft content.
        </div>
      ) : null}

      {lesson.isAvailable ? (
        <LibraryLessonDetailView lesson={lesson} />
      ) : (
        <LibraryLessonComingSoonView lesson={lesson} />
      )}
    </div>
  )
}
