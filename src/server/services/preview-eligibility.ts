/**
 * Pure, dependency-free decision logic for the draft-content preview path.
 *
 * This module deliberately imports no runtime dependencies (no Supabase, no
 * `server-only`, no path-aliased values) so the security-critical authorization
 * rules can be unit tested in isolation. The async service wrappers in
 * entitlement.service.ts / content.service.ts perform the I/O and delegate the
 * actual decisions here.
 */

import type { UserRole } from "@/features/auth/types"

/**
 * Marker prefix written to `subscriptions.stripe_subscription_id` by
 * scripts/complimentary-access.mjs (`comp_launch_testing_<profileId>`). This is
 * the single reusable server-side signal for complimentary launch-testing
 * access. Preview eligibility keys off this marker — never the tester email and
 * never plan-3 membership generically.
 */
export const COMP_PREVIEW_MARKER_PREFIX = "comp_launch_testing_"

/** Roles that may always preview unpublished (draft) course content. */
export const PREVIEW_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  "admin",
  "super_admin",
])

const ACTIVE_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "trialing",
])

export type PreviewContentStatus = "published" | "draft"

export type SubscriptionSnapshot = {
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  stripe_subscription_id?: string | null
}

/**
 * Mirrors the ordinary entitlement definition of an "active" subscription: an
 * active/trialing status, or a cancel-at-period-end subscription whose period
 * has not yet elapsed. An elapsed period is never active.
 */
export function isActiveSubscription(
  subscription: SubscriptionSnapshot,
  now: number = Date.now()
): boolean {
  const periodEnd = subscription.current_period_end
    ? Date.parse(subscription.current_period_end)
    : null
  const hasValidPeriodEnd =
    periodEnd !== null && !Number.isNaN(periodEnd) && periodEnd > now

  if (periodEnd !== null && !Number.isNaN(periodEnd) && periodEnd <= now) {
    return false
  }

  if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return true
  }

  if (subscription.cancel_at_period_end && hasValidPeriodEnd) {
    return true
  }

  return false
}

/** True only for the complimentary launch-testing marker prefix. */
export function isCompPreviewMarker(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(COMP_PREVIEW_MARKER_PREFIX)
}

/** True when at least one subscription is an active complimentary-marker grant. */
export function hasActiveCompPreviewSubscription(
  subscriptions: SubscriptionSnapshot[],
  now: number = Date.now()
): boolean {
  return subscriptions.some(
    (subscription) =>
      isCompPreviewMarker(subscription.stripe_subscription_id) &&
      isActiveSubscription(subscription, now)
  )
}

/**
 * Decides whether a profile is *eligible* to preview draft content, independent
 * of whether preview was requested. Eligible iff the role is admin/super_admin,
 * or the profile holds an active complimentary launch-testing subscription.
 */
export function evaluatePreviewEligibility(
  input: { role: UserRole; subscriptions: SubscriptionSnapshot[] },
  now: number = Date.now()
): boolean {
  if (PREVIEW_ROLES.has(input.role)) {
    return true
  }

  return hasActiveCompPreviewSubscription(input.subscriptions, now)
}

/**
 * Combines the untrusted request intent with server-derived eligibility. The
 * `?preview=1` flag alone never authorizes preview.
 */
export function combinePreviewDecision(
  requested: boolean,
  eligible: boolean
): boolean {
  return requested && eligible
}

/** Content statuses to query: drafts are included only under an active preview. */
export function selectContentStatuses(
  previewAuthorized: boolean
): PreviewContentStatus[] {
  return previewAuthorized ? ["published", "draft"] : ["published"]
}

/**
 * A lesson is available (openable, playable, completable) only when both it and
 * its module are fully published. Draft content surfaced in preview is never
 * available.
 */
export function deriveLessonAvailability(
  lessonStatus: string,
  moduleStatus: string
): boolean {
  return lessonStatus === "published" && moduleStatus === "published"
}
