/**
 * Pure My Library course-card progress + CTA mapping.
 * Progress counts must come from published lessons + existing video_progress —
 * never invent totals, and never treat the placeholder "Coming soon" as a
 * stand-in for real progress on accessible courses.
 */

export type LibraryCourseCardProgressKind =
  | "coming_soon"
  | "not_started"
  | "in_progress"
  | "completed"

export type LibraryCourseCardCtaLabel =
  | "Start course"
  | "Continue course"
  | "Review course"

export type LibraryCourseCardProgressInput = {
  courseId: string
  /** True when entitlement allows opening the course route. */
  canOpen: boolean
  /** True when the course itself is published/available to members. */
  isAvailable: boolean
  /** Completed published lessons (from existing lesson/video progress). */
  completedLessons: number
  /** Published lesson count (Welcome + published daily lessons for Reset). */
  totalLessons: number
}

export type LibraryCourseCardProgressView = {
  kind: LibraryCourseCardProgressKind
  progressLabel: string
  progressPercentage: number
  ctaLabel: LibraryCourseCardCtaLabel | null
  href: string | null
}

function libraryCourseHref(courseId: string): string {
  return `/dashboard/library/${courseId}`
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }

  return Math.floor(value)
}

export function libraryCourseProgressPercentage(
  completedLessons: number,
  totalLessons: number
): number {
  const completed = clampNonNegative(completedLessons)
  const total = clampNonNegative(totalLessons)

  if (total <= 0) {
    return 0
  }

  return Math.min(100, Math.round((Math.min(completed, total) / total) * 100))
}

/**
 * Maps trusted server facts to library card progress + CTA.
 * Coming soon is reserved for unpublished/unavailable courses the user cannot open.
 */
export function resolveLibraryCourseCardProgress(
  input: LibraryCourseCardProgressInput
): LibraryCourseCardProgressView {
  const completedLessons = clampNonNegative(input.completedLessons)
  const totalLessons = clampNonNegative(input.totalLessons)

  // Coming soon only when both: unavailable AND the user cannot open it.
  // Accessible courses must never fall back to the placeholder "Coming soon".
  if (!input.isAvailable && !input.canOpen) {
    return {
      kind: "coming_soon",
      progressLabel: "Coming soon",
      progressPercentage: 0,
      ctaLabel: null,
      href: null,
    }
  }

  const href = input.canOpen ? libraryCourseHref(input.courseId) : null
  const progressPercentage = libraryCourseProgressPercentage(
    completedLessons,
    totalLessons
  )

  if (totalLessons > 0 && completedLessons >= totalLessons) {
    return {
      kind: "completed",
      progressLabel: "Completed",
      progressPercentage: 100,
      ctaLabel: input.canOpen ? "Review course" : null,
      href,
    }
  }

  if (completedLessons > 0 || progressPercentage > 0) {
    return {
      kind: "in_progress",
      progressLabel: `${Math.min(completedLessons, totalLessons)} of ${totalLessons} lessons`,
      progressPercentage,
      ctaLabel: input.canOpen ? "Continue course" : null,
      href,
    }
  }

  return {
    kind: "not_started",
    progressLabel: "Not started",
    progressPercentage: 0,
    ctaLabel: input.canOpen ? "Start course" : null,
    href,
  }
}
