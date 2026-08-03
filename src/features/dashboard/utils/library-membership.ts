/**
 * Pure My Library / membership-hub presentation helpers.
 * Entitlement facts must come from getEffectiveMembership — never from the browser.
 * Safe for Node unit tests (no path aliases beyond relative imports).
 */

export const MEMBERSHIP_HUB_PATH = "/dashboard/membership" as const
export const MEMBERSHIP_RECORDINGS_PATH = "/dashboard/recorded-sessions" as const
export const MEMBERSHIP_LIVE_SESSIONS_PATH = "/dashboard/live-sessions" as const

/**
 * Seeded course containers that mirrored membership capabilities.
 * Keep DB records for admin/history; hide from member-facing My Library.
 */
export const MEMBERSHIP_PLACEHOLDER_COURSE_SLUGS = [
  "core-course-library",
  "virtual-live-session-library",
  "in-person-monthly-extras",
] as const

export type MembershipPlaceholderCourseSlug =
  (typeof MEMBERSHIP_PLACEHOLDER_COURSE_SLUGS)[number]

export type MembershipAccessSourceLabel =
  | "Personally billed"
  | "Nonprofit-sponsored"
  | "Complimentary"
  | "No membership"

export type MembershipCardBenefit =
  | "Weekly live online sessions"
  | "Recorded session archive"
  | "In-person sessions"

export type MembershipLibraryCardView = {
  planName: string
  planBadge: string
  accessSourceLabel: MembershipAccessSourceLabel
  benefits: MembershipCardBenefit[]
  ctaLabel: "Open membership"
  ctaHref: typeof MEMBERSHIP_HUB_PATH
  showPrice: false
}

export type CapabilityCustomerLabel =
  | "Recorded session library"
  | "Weekly live online sessions"
  | "In-person sessions"
  | "Integration Journal"
  | "Session replays"
  | "Leadership sessions"
  | "Priority support"

const CAPABILITY_CUSTOMER_LABELS: Record<string, CapabilityCustomerLabel> = {
  membership_course_library: "Recorded session library",
  live_online_sessions: "Weekly live online sessions",
  in_person_sessions: "In-person sessions",
  integration_journal: "Integration Journal",
  session_replays: "Session replays",
  leadership_sessions: "Leadership sessions",
  priority_support: "Priority support",
}

export function isMembershipPlaceholderCourseSlug(slug: string): boolean {
  return (MEMBERSHIP_PLACEHOLDER_COURSE_SLUGS as readonly string[]).includes(slug)
}

/** Hide internal membership containers from member My Library grids. */
export function filterMemberLibraryCourses<T extends { slug: string }>(
  courses: T[]
): T[] {
  return courses.filter(
    (course) => !isMembershipPlaceholderCourseSlug(course.slug)
  )
}

export function formatMembershipAccessSource(source: string): MembershipAccessSourceLabel {
  switch (source) {
    case "personal_stripe":
      return "Personally billed"
    case "nonprofit_sponsored":
      return "Nonprofit-sponsored"
    case "complimentary":
      return "Complimentary"
    default:
      return "No membership"
  }
}

export function formatCapabilityCustomerLabel(capability: string): string {
  return CAPABILITY_CUSTOMER_LABELS[capability] ?? capability.replaceAll("_", " ")
}

export function formatCapabilityCustomerLabels(
  capabilities: readonly string[]
): string[] {
  return capabilities.map(formatCapabilityCustomerLabel)
}

export function membershipCardBenefits(input: {
  canAttendInPerson: boolean
}): MembershipCardBenefit[] {
  const benefits: MembershipCardBenefit[] = [
    "Weekly live online sessions",
    "Recorded session archive",
  ]

  if (input.canAttendInPerson) {
    benefits.push("In-person sessions")
  }

  return benefits
}

/**
 * One Elevate Membership card for My Library when the user has an effective plan.
 * Reset-only users (source none / no plan) receive null.
 */
export function buildMembershipLibraryCardView(input: {
  effectivePlanName: string | null
  effectiveTierSlug: string | null
  source: string
  status: string
  canAttendInPerson: boolean
}): MembershipLibraryCardView | null {
  if (
    !input.effectivePlanName ||
    !input.effectiveTierSlug ||
    input.source === "none" ||
    input.status === "none"
  ) {
    return null
  }

  return {
    planName: input.effectivePlanName,
    planBadge: "Current plan",
    accessSourceLabel: formatMembershipAccessSource(input.source),
    benefits: membershipCardBenefits({
      canAttendInPerson: input.canAttendInPerson,
    }),
    ctaLabel: "Open membership",
    ctaHref: MEMBERSHIP_HUB_PATH,
    showPrice: false,
  }
}

export function formatMembershipStatusLabel(status: string): string {
  return status.replaceAll("_", " ")
}

export const MEMBERSHIP_NO_SESSION_COPY =
  "No upcoming session is scheduled yet. New session details will appear here once published." as const

export const MEMBERSHIP_NO_RECORDINGS_COPY =
  "Recordings will appear here after completed live sessions are published." as const

export function latestRecordingsForHub<T>(
  recordings: readonly T[],
  limit = 3
): T[] {
  return recordings.slice(0, Math.max(0, limit))
}

export type LiveSessionScheduleState =
  | { kind: "unscheduled"; label: string }
  | { kind: "upcoming"; label: string; joinAvailable: false }
  | { kind: "join_open"; label: string; joinAvailable: true }
  | { kind: "ended"; label: string; joinAvailable: false }

export function resolveLiveSessionScheduleState(input: {
  startsAt: string | null
  endsAt: string | null
  completedAt: string | null
  joinOpenBeforeMinutes?: number
  joinCloseAfterMinutes?: number
  defaultDurationMinutes?: number
  now?: Date
}): LiveSessionScheduleState {
  if (input.completedAt) {
    return {
      kind: "ended",
      label: "This session has ended.",
      joinAvailable: false,
    }
  }

  if (!input.startsAt) {
    return {
      kind: "unscheduled",
      label: "Schedule coming soon.",
    }
  }

  const starts = new Date(input.startsAt)
  if (Number.isNaN(starts.getTime())) {
    return {
      kind: "unscheduled",
      label: "Schedule coming soon.",
    }
  }

  const openBefore = (input.joinOpenBeforeMinutes ?? 30) * 60_000
  const closeAfter = (input.joinCloseAfterMinutes ?? 30) * 60_000
  const defaultDuration = (input.defaultDurationMinutes ?? 90) * 60_000
  const ends = input.endsAt
    ? new Date(input.endsAt)
    : new Date(starts.getTime() + defaultDuration)

  if (Number.isNaN(ends.getTime())) {
    return {
      kind: "unscheduled",
      label: "Schedule coming soon.",
    }
  }

  const now = input.now ?? new Date()
  const openAt = new Date(starts.getTime() - openBefore)
  const closeAt = new Date(ends.getTime() + closeAfter)

  if (now > closeAt) {
    return {
      kind: "ended",
      label: "This session has ended.",
      joinAvailable: false,
    }
  }

  if (now >= openAt && now <= closeAt) {
    return {
      kind: "join_open",
      label: "Join is open now.",
      joinAvailable: true,
    }
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(starts)

  return {
    kind: "upcoming",
    label: `Starts ${formatted} UTC · Join opens 30 minutes before.`,
    joinAvailable: false,
  }
}
