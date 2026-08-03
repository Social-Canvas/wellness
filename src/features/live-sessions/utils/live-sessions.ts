/**
 * Pure live-session access helpers (no path aliases / no DB).
 * Safe for Node unit tests.
 */

export const LIVE_SESSION_KINDS = ["membership_weekly", "public_trial"] as const
export type LiveSessionKind = (typeof LIVE_SESSION_KINDS)[number]

export const LIVE_REGISTRATION_TYPES = ["member", "public_trial"] as const
export type LiveRegistrationType = (typeof LIVE_REGISTRATION_TYPES)[number]

export const LIVE_REGISTRATION_STATUSES = [
  "pending_payment",
  "confirmed",
  "cancelled",
  "attended",
  "expired",
] as const
export type LiveRegistrationStatus = (typeof LIVE_REGISTRATION_STATUSES)[number]

export const ORGANIZATION_BILLING_TIERS = [
  "small",
  "mid_size",
  "large",
  "enterprise",
] as const
export type OrganizationBillingTier = (typeof ORGANIZATION_BILLING_TIERS)[number]

/** Nonprofit seat bands map to billing only — never to Gold/Platinum content. */
export const SPONSORED_CONTENT_PLAN_SLUG = "plan-1" as const

export const MEMBERSHIP_JOIN_WINDOW = {
  /** Minutes before starts_at when member join opens */
  openBeforeMinutes: 30,
  /** Minutes after ends_at (or starts_at+90m fallback) when join closes */
  closeAfterMinutes: 30,
  defaultDurationMinutes: 90,
} as const

export type PublicLiveSessionCard = {
  id: string
  title: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  sessionKind: LiveSessionKind
  allowsPublicTrial: boolean
  trialOpen: boolean
  capacity: number | null
  status: string
  /** Never include Zoom URLs here */
}

export type SafeLiveSessionPublicFields = {
  id: string
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  session_kind: LiveSessionKind
  allows_public_trial: boolean
  trial_open: boolean
  capacity: number | null
  status: string
  access_type: string
  plan_id: string | null
  completed_at: string | null
  calendly_url: string | null
}

/** Strip any accidental Zoom/host fields before serializing to clients. */
export function toPublicLiveSessionCard(
  row: SafeLiveSessionPublicFields
): PublicLiveSessionCard {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sessionKind: row.session_kind,
    allowsPublicTrial: row.allows_public_trial,
    trialOpen: row.trial_open,
    capacity: row.capacity,
    status: row.status,
  }
}

export function assertNoZoomUrlsInPublicPayload(
  payload: Record<string, unknown>
): boolean {
  const forbidden = [
    "zoom_join_url",
    "zoom_participant_url",
    "zoom_host_url",
    "zoomJoinUrl",
    "zoomParticipantUrl",
    "zoomHostUrl",
  ]
  return forbidden.every((key) => !(key in payload) || payload[key] == null)
}

export function resolveSessionEndAt(input: {
  startsAt: string | null
  endsAt: string | null
}): Date | null {
  if (input.endsAt) {
    const ends = new Date(input.endsAt)
    return Number.isNaN(ends.getTime()) ? null : ends
  }
  if (!input.startsAt) {
    return null
  }
  const starts = new Date(input.startsAt)
  if (Number.isNaN(starts.getTime())) {
    return null
  }
  return new Date(
    starts.getTime() + MEMBERSHIP_JOIN_WINDOW.defaultDurationMinutes * 60_000
  )
}

export function isWithinMemberJoinWindow(input: {
  startsAt: string | null
  endsAt: string | null
  now?: Date
}): boolean {
  if (!input.startsAt) {
    return false
  }
  const now = input.now ?? new Date()
  const starts = new Date(input.startsAt)
  if (Number.isNaN(starts.getTime())) {
    return false
  }
  const ends = resolveSessionEndAt(input)
  if (!ends) {
    return false
  }
  const openAt = new Date(
    starts.getTime() - MEMBERSHIP_JOIN_WINDOW.openBeforeMinutes * 60_000
  )
  const closeAt = new Date(
    ends.getTime() + MEMBERSHIP_JOIN_WINDOW.closeAfterMinutes * 60_000
  )
  return now >= openAt && now <= closeAt
}

export function canMemberJoinLiveSession(input: {
  hasLiveOnlineCapability: boolean
  sessionStatus: string
  startsAt: string | null
  endsAt: string | null
  completedAt: string | null
  now?: Date
}): { ok: true } | { ok: false; reason: string } {
  if (!input.hasLiveOnlineCapability) {
    return {
      ok: false,
      reason: "An active membership with live online sessions is required.",
    }
  }
  if (input.sessionStatus !== "published") {
    return { ok: false, reason: "This session is not available." }
  }
  if (input.completedAt) {
    return { ok: false, reason: "This session has already ended." }
  }
  if (
    !isWithinMemberJoinWindow({
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      now: input.now,
    })
  ) {
    return {
      ok: false,
      reason: "Join opens shortly before the session start time.",
    }
  }
  return { ok: true }
}

export function canTrialUserJoinLiveSession(input: {
  registrationStatus: LiveRegistrationStatus | null
  registrationType: LiveRegistrationType | null
  liveClassId: string
  registrationLiveClassId: string | null
  sessionStatus: string
  startsAt: string | null
  endsAt: string | null
  completedAt: string | null
  now?: Date
}): { ok: true } | { ok: false; reason: string } {
  if (
    input.registrationType !== "public_trial" ||
    !input.registrationStatus ||
    !["confirmed", "attended"].includes(input.registrationStatus)
  ) {
    return {
      ok: false,
      reason: "A confirmed trial registration is required for this session.",
    }
  }
  if (input.registrationLiveClassId !== input.liveClassId) {
    return {
      ok: false,
      reason: "Trial access applies only to the session you registered for.",
    }
  }
  if (input.sessionStatus !== "published") {
    return { ok: false, reason: "This session is not available." }
  }
  if (input.completedAt) {
    return { ok: false, reason: "This session has already ended." }
  }
  if (
    !isWithinMemberJoinWindow({
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      now: input.now,
    })
  ) {
    return {
      ok: false,
      reason: "Join opens shortly before the session start time.",
    }
  }
  return { ok: true }
}

/** Trial never grants membership, recordings, or future sessions. */
export function trialGrantsMembershipStatus(): boolean {
  return false
}

export function trialGrantsRecordingsAccess(): boolean {
  return false
}

export function trialGrantsFutureSessions(): boolean {
  return false
}

export function billingTierMapsToContentPlan(
  billingTier: OrganizationBillingTier
): string | null {
  void billingTier
  // Seat/billing bands never select Gold/Platinum content.
  return null
}

export function sponsoredContentPlanSlug(): string {
  return SPONSORED_CONTENT_PLAN_SLUG
}

export function mapNonprofitSeatSlugToBillingTier(
  seatSlug: string
): OrganizationBillingTier | null {
  switch (seatSlug) {
    case "small":
      return "small"
    case "mid-size":
    case "mid_size":
      return "mid_size"
    case "large":
      return "large"
    case "enterprise":
      return "enterprise"
    default:
      return null
  }
}

export function isConfirmedLiveRegistration(
  status: LiveRegistrationStatus
): boolean {
  return status === "confirmed" || status === "attended"
}

export function shouldOfferTrialFeedback(input: {
  registrationType: LiveRegistrationType
  registrationStatus: LiveRegistrationStatus
  sessionCompleted: boolean
  feedbackSubmitted: boolean
}): boolean {
  return (
    input.registrationType === "public_trial" &&
    isConfirmedLiveRegistration(input.registrationStatus) &&
    input.sessionCompleted &&
    !input.feedbackSubmitted
  )
}

export function membershipCtaPathAfterTrial(): string {
  return "/programs#memberships"
}

/**
 * Checkout metadata keys trusted only when written server-side and verified
 * against DB on webhook (never trust browser-submitted amounts/titles).
 */
export const LIVE_TRIAL_CHECKOUT_METADATA_KEYS = {
  purchaseType: "live_session_trial",
  liveClassId: "live_class_id",
  productId: "product_id",
  profileId: "profile_id",
  purchaseTypeLegacy: "purchase_type",
} as const

export function buildLiveTrialCheckoutMetadata(input: {
  profileId: string
  productId: string
  liveClassId: string
}): Record<string, string> {
  return {
    profile_id: input.profileId,
    product_id: input.productId,
    purchase_type: LIVE_TRIAL_CHECKOUT_METADATA_KEYS.purchaseType,
    live_class_id: input.liveClassId,
  }
}

export function parseLiveTrialCheckoutMetadata(
  metadata: Record<string, string | undefined> | null | undefined
): { profileId: string; productId: string; liveClassId: string } | null {
  if (!metadata) {
    return null
  }
  const purchaseType = metadata.purchase_type
  if (purchaseType !== LIVE_TRIAL_CHECKOUT_METADATA_KEYS.purchaseType) {
    return null
  }
  const profileId = metadata.profile_id
  const productId = metadata.product_id
  const liveClassId = metadata.live_class_id
  if (!profileId || !productId || !liveClassId) {
    return null
  }
  return { profileId, productId, liveClassId }
}

/** Recording attach: same recorded_sessions row shared by all entitled members. */
export function recordingAccessIsSharedAcrossPlans(): boolean {
  return true
}

export function goldPlatinumInheritCoreLiveAndRecordings(): boolean {
  return true
}
