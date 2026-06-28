import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  LibraryCertificatePlaceholder,
  LibraryModuleList,
  LibraryPageHeader,
  LibraryProgressPlaceholder,
} from "@/features/content/components"
import { getAccessibleCourse } from "@/features/content/services/content.service"

interface CourseLibraryPageProps {
  params: Promise<{ courseId: string }>
}

export async function generateMetadata({
  params,
}: CourseLibraryPageProps): Promise<Metadata> {
  const { courseId } = await params
  const result = await getAccessibleCourse(courseId)

  if (!result.success) {
    return { title: "Course" }
  }

  return {
    title: result.data.title,
    description: result.data.description ?? undefined,
  }
}

export default async function CourseLibraryPage({ params }: CourseLibraryPageProps) {
  const { courseId } = await params
  const result = await getAccessibleCourse(courseId)

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

  return (
    <div className="mt-9 space-y-6">
      <LibraryPageHeader
        breadcrumb={[
          { label: "Library", href: "/dashboard/library" },
          { label: course.title },
        ]}
        title={course.title}
        description={course.description}
        meta={<LibraryCertificatePlaceholder enabled={course.certificateEnabled} />}
      />

      <LibraryProgressPlaceholder />

      <LibraryModuleList courseId={course.id} modules={course.modules} />
    </div>
  )
}
