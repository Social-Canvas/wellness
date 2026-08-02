export const MEMBERSHIP_CAPABILITIES = [
  "membership_course_library",
  "live_online_sessions",
  "in_person_sessions",
  "integration_journal",
  "session_replays",
  "leadership_sessions",
  "priority_support",
] as const

export type MembershipCapability = (typeof MEMBERSHIP_CAPABILITIES)[number]

export const DEFAULT_CAPABILITIES_BY_PLAN_SLUG: Record<
  string,
  MembershipCapability[]
> = {
  "plan-1": [
    "membership_course_library",
    "live_online_sessions",
    "session_replays",
  ],
  "plan-2": [
    "membership_course_library",
    "live_online_sessions",
    "session_replays",
    "in_person_sessions",
  ],
  "plan-3": [
    "membership_course_library",
    "live_online_sessions",
    "session_replays",
    "in_person_sessions",
    "priority_support",
  ],
}

export function defaultCapabilitiesForPlanSlug(
  slug: string
): MembershipCapability[] {
  return DEFAULT_CAPABILITIES_BY_PLAN_SLUG[slug] ?? []
}
