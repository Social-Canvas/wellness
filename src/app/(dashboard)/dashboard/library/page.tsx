import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BrandImage } from "@/components/media"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  LibraryCourseCard,
  LibraryPageHeader,
} from "@/features/content/components"
import { listAccessibleCourses } from "@/features/content/services/content.service"
import { MembershipLibraryCard } from "@/features/dashboard/components/membership-library-card"
import {
  buildMembershipLibraryCardView,
  filterMemberLibraryCourses,
} from "@/features/dashboard/utils/library-membership"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { getEffectiveMembership } from "@/server/services/membership.service"

export const metadata: Metadata = {
  title: "My Library",
  description: "Your courses and Elevate membership.",
}

export default async function LibraryPage() {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const [coursesResult, membershipResult] = await Promise.all([
    listAccessibleCourses(profileResult.data.id),
    getEffectiveMembership(profileResult.data.id),
  ])

  if (!coursesResult.success) {
    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[{ label: "My Library" }]}
          title="My Library"
          description="Your owned courses and Elevate membership."
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">
            {coursesResult.error.message}
          </p>
        </div>
      </div>
    )
  }

  const courses = filterMemberLibraryCourses(coursesResult.data)
  const membershipCard = membershipResult.success
    ? buildMembershipLibraryCardView(membershipResult.data)
    : null

  const hasItems = courses.length > 0 || Boolean(membershipCard)

  if (!hasItems) {
    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[{ label: "My Library" }]}
          title="My Library"
          description="Your owned courses and Elevate membership."
        />
        <div className="overflow-hidden rounded-2xl border border-dashed border-line bg-cream2/50">
          <div className="grid items-center gap-6 min-[861px]:grid-cols-[1.1fr_0.9fr]">
            <div className="px-6 py-10 text-center min-[861px]:text-left">
              <p className="font-display text-lg font-medium text-ink">
                Nothing in your library yet
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Courses and memberships you own will appear here. Explore
                programs to see what is available.
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
        breadcrumb={[{ label: "My Library" }]}
        title="My Library"
        description="Your owned courses and Elevate membership."
      />
      <div
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        data-member-library-grid
      >
        {courses.map((course) => (
          <LibraryCourseCard key={course.id} course={course} />
        ))}
        {membershipCard ? (
          <MembershipLibraryCard membership={membershipCard} />
        ) : null}
      </div>
    </div>
  )
}
