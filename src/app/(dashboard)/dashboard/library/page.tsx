import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BrandImage } from "@/components/media"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  LibraryCourseGrid,
  LibraryPageHeader,
} from "@/features/content/components"
import { listAccessibleCourses } from "@/features/content/services/content.service"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: "Library",
  description: "Browse your course library.",
}

export default async function LibraryPage() {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const result = await listAccessibleCourses(profileResult.data.id)

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
        <div className="overflow-hidden rounded-2xl border border-dashed border-line bg-cream2/50">
          <div className="grid items-center gap-6 min-[861px]:grid-cols-[1.1fr_0.9fr]">
            <div className="px-6 py-10 text-center min-[861px]:text-left">
              <p className="font-display text-lg font-medium text-ink">No courses yet</p>
              <p className="mt-2 text-sm text-ink-soft">
                Published courses will appear here when they are ready. Explore programs to see
                what is available.
              </p>
            </div>
            <BrandImage
              image={BRAND_IMAGES.meditationSession}
              containerClassName="aspect-[16/10] w-full min-h-[220px]"
              sizes="(max-width: 860px) 100vw, 40vw"
            />
          </div>
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
