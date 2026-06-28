import type { Metadata } from "next"

import {
  LibraryCourseGrid,
  LibraryPageHeader,
} from "@/features/content/components"
import { listAccessibleCourses } from "@/features/content/services/content.service"

export const metadata: Metadata = {
  title: "Library",
  description: "Browse your course library.",
}

export default async function LibraryPage() {
  const result = await listAccessibleCourses()

  if (!result.success) {
    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[{ label: "Library" }]}
          title="Course library"
          description="Browse published courses and continue your practice."
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  if (result.data.length === 0) {
    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[{ label: "Library" }]}
          title="Course library"
          description="Browse published courses and continue your practice."
        />
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No courses yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Published courses will appear here when they are ready.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-9 space-y-6">
      <LibraryPageHeader
        breadcrumb={[{ label: "Library" }]}
        title="Course library"
        description="Browse published courses and continue your practice."
      />
      <LibraryCourseGrid courses={result.data} />
    </div>
  )
}
