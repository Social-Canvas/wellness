/**
 * Pure virtual live-session quota model (no DB / path aliases).
 *
 * Confirmed:
 * - Gold: included, limit 2, monthly
 * - Platinum: unlimited (explicit, not a large sentinel)
 *
 * Unresolved — leave enforcement inactive:
 * - Core virtual access vs library-only
 * - Nonprofit-sponsored mirroring Core
 * - Whether "monthly" should be calendar month vs Stripe billing period
 *
 * Until the client confirms period semantics, Gold enforcement uses
 * `calendar_month` to match public "per month" copy. Billing-period
 * bounds remain supported by the model for a future switch.
 */

export type VirtualLiveSessionLimitPeriod =
  | "calendar_month"
  | "billing_period"

export type VirtualLiveSessionQuotaMode =
  | "none"
  | "limited"
  | "unlimited"

export type VirtualLiveSessionQuotaConfig = {
  virtualLiveSessionsIncluded: boolean
  mode: VirtualLiveSessionQuotaMode
  /** Set only when mode === "limited". Never use a sentinel for unlimited. */
  limit: number | null
  limitPeriod: VirtualLiveSessionLimitPeriod | null
  /**
   * When false, keep legacy boolean `live_online_sessions` join behavior.
   * Gold quota enforcement is the only activated limited plan today.
   */
  quotaEnforcementActive: boolean
}

export type VirtualLiveSessionUsageSnapshot = {
  mode: VirtualLiveSessionQuotaMode
  limit: number | null
  used: number
  remaining: number | null
  periodStart: string | null
  periodEnd: string | null
  periodLabel: "month" | "billing_period" | "none"
}

export type QuotaReservationStatus =
  | "confirmed"
  | "attended"
  | "cancelled"
  | "expired"
  | "pending_payment"

/** Statuses that consume an included virtual-session allowance. */
export const QUOTA_CONSUMING_RESERVATION_STATUSES = [
  "confirmed",
  "attended",
] as const satisfies readonly QuotaReservationStatus[]

export function isQuotaConsumingReservationStatus(
  status: string
): boolean {
  return (QUOTA_CONSUMING_RESERVATION_STATUSES as readonly string[]).includes(
    status
  )
}

/**
 * Plan quota targets. Core/nonprofit keep current boolean capability behavior
 * (`quotaEnforcementActive: false`) until the client confirms final rules.
 */
export const VIRTUAL_LIVE_SESSION_QUOTA_BY_PLAN: Record<
  string,
  VirtualLiveSessionQuotaConfig
> = {
  "plan-1": {
    virtualLiveSessionsIncluded: true,
    mode: "unlimited",
    limit: null,
    limitPeriod: null,
    quotaEnforcementActive: false,
  },
  "plan-2": {
    virtualLiveSessionsIncluded: true,
    mode: "limited",
    limit: 2,
    limitPeriod: "calendar_month",
    quotaEnforcementActive: true,
  },
  "plan-3": {
    virtualLiveSessionsIncluded: true,
    mode: "unlimited",
    limit: null,
    limitPeriod: null,
    quotaEnforcementActive: false,
  },
}

export function virtualLiveSessionQuotaForPlan(
  planSlug: string | null | undefined
): VirtualLiveSessionQuotaConfig | null {
  if (!planSlug) {
    return null
  }
  return VIRTUAL_LIVE_SESSION_QUOTA_BY_PLAN[planSlug] ?? null
}

/**
 * Quota reservation enforcement applies only to personally confirmed limited
 * plans (Gold today). Nonprofit / Core stay on legacy boolean join until
 * confirmed — do not revoke their existing live access.
 */
export function shouldEnforceVirtualSessionQuota(input: {
  planSlug: string | null | undefined
  accessSource: string
}): boolean {
  if (
    input.accessSource === "nonprofit_sponsored" ||
    input.accessSource === "none"
  ) {
    return false
  }
  const config = virtualLiveSessionQuotaForPlan(input.planSlug)
  return Boolean(
    config?.quotaEnforcementActive &&
      config.mode === "limited" &&
      typeof config.limit === "number" &&
      config.limit > 0
  )
}

export function isUnlimitedVirtualLiveAccess(
  config: VirtualLiveSessionQuotaConfig | null
): boolean {
  return config?.mode === "unlimited"
}

export function resolveCalendarMonthPeriod(now: Date = new Date()): {
  start: Date
  end: Date
} {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  )
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  )
  return { start, end }
}

export function resolveBillingPeriod(input: {
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
}): { start: Date; end: Date } | null {
  if (!input.currentPeriodStart || !input.currentPeriodEnd) {
    return null
  }
  const start = new Date(input.currentPeriodStart)
  const end = new Date(input.currentPeriodEnd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null
  }
  if (end <= start) {
    return null
  }
  return { start, end }
}

export function resolveQuotaPeriodBounds(input: {
  limitPeriod: VirtualLiveSessionLimitPeriod | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  now?: Date
}): { start: Date; end: Date; periodLabel: VirtualLiveSessionUsageSnapshot["periodLabel"] } | null {
  if (input.limitPeriod === "calendar_month") {
    const bounds = resolveCalendarMonthPeriod(input.now)
    return { ...bounds, periodLabel: "month" }
  }
  if (input.limitPeriod === "billing_period") {
    const bounds = resolveBillingPeriod({
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
    })
    if (!bounds) {
      return null
    }
    return { ...bounds, periodLabel: "billing_period" }
  }
  return null
}

export function countQuotaConsumingReservations(input: {
  reservations: ReadonlyArray<{
    status: string
    registrationType: string
    liveClassStatus: string | null
    liveClassStartsAt: string | null
  }>
  periodStart: Date
  periodEnd: Date
}): number {
  let used = 0
  for (const row of input.reservations) {
    if (row.registrationType !== "member") {
      continue
    }
    if (!isQuotaConsumingReservationStatus(row.status)) {
      continue
    }
    // Admin-cancelled / archived sessions must not consume allowance.
    if (row.liveClassStatus !== "published") {
      continue
    }
    if (!row.liveClassStartsAt) {
      continue
    }
    const starts = new Date(row.liveClassStartsAt)
    if (Number.isNaN(starts.getTime())) {
      continue
    }
    if (starts >= input.periodStart && starts < input.periodEnd) {
      used += 1
    }
  }
  return used
}

export function buildVirtualLiveSessionUsageSnapshot(input: {
  config: VirtualLiveSessionQuotaConfig
  used: number
  periodStart: Date | null
  periodEnd: Date | null
  periodLabel: VirtualLiveSessionUsageSnapshot["periodLabel"]
}): VirtualLiveSessionUsageSnapshot {
  if (input.config.mode === "unlimited") {
    return {
      mode: "unlimited",
      limit: null,
      used: input.used,
      remaining: null,
      periodStart: input.periodStart?.toISOString() ?? null,
      periodEnd: input.periodEnd?.toISOString() ?? null,
      periodLabel: "none",
    }
  }

  if (input.config.mode === "none" || input.config.limit == null) {
    return {
      mode: "none",
      limit: 0,
      used: 0,
      remaining: 0,
      periodStart: null,
      periodEnd: null,
      periodLabel: "none",
    }
  }

  const remaining = Math.max(0, input.config.limit - input.used)
  return {
    mode: "limited",
    limit: input.config.limit,
    used: input.used,
    remaining,
    periodStart: input.periodStart?.toISOString() ?? null,
    periodEnd: input.periodEnd?.toISOString() ?? null,
    periodLabel: input.periodLabel,
  }
}

export function canReserveUnderQuota(input: {
  usage: VirtualLiveSessionUsageSnapshot
  alreadyReservedForSession: boolean
}): { ok: true } | { ok: false; reason: string } {
  if (input.alreadyReservedForSession) {
    return { ok: false, reason: "You already reserved this live session." }
  }
  if (input.usage.mode === "unlimited") {
    return { ok: true }
  }
  if (input.usage.mode !== "limited" || input.usage.limit == null) {
    return {
      ok: false,
      reason: "Live virtual session reservations are not available on your plan.",
    }
  }
  if ((input.usage.remaining ?? 0) <= 0) {
    return {
      ok: false,
      reason:
        "You have used both included live virtual sessions for this month. Upgrade to Platinum for access to all live virtual classes.",
    }
  }
  return { ok: true }
}

/** Join for quota plans requires an active reservation; join must not create usage. */
export function canJoinWithQuotaReservation(input: {
  hasActiveReservation: boolean
  enforcementActive: boolean
}): { ok: true } | { ok: false; reason: string } {
  if (!input.enforcementActive) {
    return { ok: true }
  }
  if (!input.hasActiveReservation) {
    return {
      ok: false,
      reason: "Reserve this live session before joining.",
    }
  }
  return { ok: true }
}

export function formatVirtualSessionAllowanceCopy(
  usage: VirtualLiveSessionUsageSnapshot
): string {
  if (usage.mode === "unlimited") {
    return "Unlimited live virtual sessions"
  }
  if (usage.mode !== "limited" || usage.limit == null) {
    return "Live virtual sessions are not included in your current plan"
  }
  const period =
    usage.periodLabel === "billing_period" ? "this billing period" : "this month"
  if ((usage.remaining ?? 0) <= 0) {
    return `You have used both included live virtual sessions for ${period}. Upgrade to Platinum for access to all live virtual classes.`
  }
  return `${usage.used} of ${usage.limit} live virtual sessions used ${period}`
}

export function formatVirtualSessionRemainingCopy(
  usage: VirtualLiveSessionUsageSnapshot
): string | null {
  if (usage.mode !== "limited" || usage.remaining == null) {
    return null
  }
  if (usage.remaining === 1) {
    return "1 live virtual session remaining"
  }
  return `${usage.remaining} live virtual sessions remaining`
}

/** Trials never consume membership virtual-session quota. */
export function trialConsumesMembershipQuota(): boolean {
  return false
}

export function membershipReservationIsStripePurchase(): boolean {
  return false
}

/**
 * Provisional note: Gold public copy says "per month". Stripe also exposes
 * `current_period_start` / `current_period_end`. These can diverge. Do not
 * silently switch Gold to billing_period without client confirmation.
 */
export const GOLD_MONTHLY_PERIOD_SEMANTICS_STATUS = {
  publicCopy: "calendar_month",
  implementedEnforcement: "calendar_month" as VirtualLiveSessionLimitPeriod,
  billingPeriodAvailableInModel: true,
  clientConfirmationRequired: true,
} as const
