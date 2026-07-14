import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { CourseCertificateCard } from "@/features/certificates/components"
import { issueCertificate } from "@/features/certificates/services/certificates.service"
import {
  LibraryModuleList,
  LibraryPageHeader,
} from "@/features/content/components"
import { getAccessibleCourse } from "@/features/content/services/content.service"
import { CourseProgressSummary } from "@/features/progress/components"
import { calculateCourseProgress } from "@/features/progress/services/progress.service"

interface CourseLibraryPageProps {
  params: Promise<{ courseId: string }>
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
}: CourseLibraryPageProps): Promise<Metadata> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return { title: "Course" }
  }

  const { courseId } = await params
  const result = await getAccessibleCourse(profileResult.data.id, courseId)

  if (!result.success) {
    return { title: "Course" }
  }

  return {
    title: result.data.title,
    description: result.data.description ?? undefined,
  }
}

export default async function CourseLibraryPage({
  params,
  searchParams,
}: CourseLibraryPageProps) {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const { courseId } = await params
  const { preview } = await searchParams
  const previewRequested = isPreviewRequested(preview)

  const result = await getAccessibleCourse(profileResult.data.id, courseId, {
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
            { label: "Course" },
          ]}
          title="Course"
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  const course = result.data
  const isPreview = course.preview
  const comingSoonCount = course.modules.reduce(
    (total, module) =>
      total + module.lessons.filter((lesson) => !lesson.isAvailable).length,
    0
  )

  const progressResult = await calculateCourseProgress(profileResult.data.id, {
    courseId: course.id,
  })

  let certificate = null

  // Certificates are never issued as a side effect of previewing draft content.
  if (
    !isPreview &&
    course.certificateEnabled &&
    progressResult.success &&
    progressResult.data.completedAt
  ) {
    const certificateResult = await issueCertificate(profileResult.data.id, {
      courseId: course.id,
    })

    if (certificateResult.success) {
      certificate = certificateResult.data
    }
  }

  return (
    <div className="mt-9 space-y-6">
      <LibraryPageHeader
        breadcrumb={[
          { label: "Library", href: "/dashboard/library" },
          { label: course.title },
        ]}
        title={course.title}
        description={course.description}
      />

      {isPreview ? (
        <div className="rounded-2xl border border-blue/30 bg-blue-soft/20 px-4 py-3 text-sm text-ink">
          <span className="font-semibold text-blue">Preview mode</span> · You are
          viewing unpublished draft content. Draft lessons are not yet available to
          members.
        </div>
      ) : null}

      {progressResult.success ? (
        <CourseProgressSummary
          progress={progressResult.data}
          preview={isPreview}
          comingSoonCount={comingSoonCount}
        />
      ) : null}

      {certificate ? <CourseCertificateCard certificate={certificate} /> : null}

      <LibraryModuleList
        courseId={course.id}
        modules={course.modules}
        preview={isPreview}
      />
    </div>
  )
}
