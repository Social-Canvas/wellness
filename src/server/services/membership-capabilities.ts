/**
 * Deployed capability keys (plan_capabilities / capabilities table).
 *
 * Shared content model:
 * - Core/Gold/Platinum all include live_online_sessions + session_replays
 *   (business alias for recordings: "recorded_sessions"). Same live schedule
 *   and same recorded_sessions archive — no per-plan content duplication.
 * - Gold virtual-session *quantity* is enforced via quota reservations
 *   (2 / calendar month) when personally billed — see virtual-session-quota.ts.
 *   Core / nonprofit keep boolean live access until client confirms.
 * - Gold/Platinum still differ by confirmed extras (e.g. in_person_sessions).
 * - Nonprofit-sponsored seats use Core-equivalent capabilities via plan-1;
 *   org Small/Mid/Large/Enterprise are billing/seat bands only.
 *
 * Do not rename session_replays in the DB — it is the deployed recording key.
 */
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

/** Business-language alias for the deployed `session_replays` capability. */
export const RECORDED_SESSIONS_CAPABILITY: MembershipCapability =
  "session_replays"

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
