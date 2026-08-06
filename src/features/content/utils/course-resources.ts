/**
 * Pure helpers for protected course resource downloads.
 */

export const COURSE_RESOURCES_BUCKET = "course-resources" as const

/** Short-lived signed download TTL (15 minutes). */
export const COURSE_RESOURCE_DOWNLOAD_URL_EXPIRES_SECONDS = 900

export type CourseResourceDownloadAuthInput = {
  isAuthenticated: boolean
  canAccessCourse: boolean
  requestedStorageBucket?: string | null
  requestedStoragePath?: string | null
}

export type CourseResourceDownloadAuthDecision =
  | { allowed: true }
  | {
      allowed: false
      reason: "unauthenticated" | "not_entitled" | "arbitrary_path_rejected"
    }

/**
 * Decide whether a course resource download may proceed.
 * Browser-supplied bucket/path is always rejected.
 */
export function decideCourseResourceDownloadAccess(
  input: CourseResourceDownloadAuthInput
): CourseResourceDownloadAuthDecision {
  if (
    input.requestedStorageBucket != null ||
    input.requestedStoragePath != null
  ) {
    return { allowed: false, reason: "arbitrary_path_rejected" }
  }

  if (!input.isAuthenticated) {
    return { allowed: false, reason: "unauthenticated" }
  }

  if (!input.canAccessCourse) {
    return { allowed: false, reason: "not_entitled" }
  }

  return { allowed: true }
}

export function downloadResponseCacheControl(): string {
  return "private, no-store"
}
