/**
 * Pure membership pricing-card CTA state for /programs.
 * Entitlement facts must come from server-side getEffectiveMembership —
 * never from browser-supplied flags.
 *
 * Kept dependency-free (no path aliases) so Node unit tests can import it
 * directly — same pattern as reset-plan-offer-state.ts.
 */

export const MEMBERSHIP_HOME_PATH = "/dashboard" as const

export const MEMBERSHIP_PLAN_SLUGS = ["plan-1", "plan-2", "plan-3"] as const

export type MembershipPlanSlug = (typeof MEMBERSHIP_PLAN_SLUGS)[number]

export const MEMBERSHIP_PLAN_SHORT_NAMES: Record<MembershipPlanSlug, string> = {
  "plan-1": "Core",
  "plan-2": "Gold",
  "plan-3": "Platinum",
}

export const MEMBERSHIP_PLAN_RANK: Record<MembershipPlanSlug, number> = {
  "plan-1": 1,
  "plan-2": 2,
  "plan-3": 3,
}

export type MembershipCtaAccessSource =
  | "none"
  | "personal_stripe"
  | "nonprofit_sponsored"
  | "complimentary"

export type MembershipCtaStatus =
  | "none"
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "cancel_at_period_end"
  | "cancelled"
  | "paused"
  | "suspended"

export type MembershipPlanCtaKind =
  | "join"
  | "current"
  | "upgrade"
  | "downgrade"
  | "downgrade_scheduled"
  | "unavailable"

export type MembershipPlanCtaFacts = {
  isAuthenticated: boolean
  source: MembershipCtaAccessSource
  status: MembershipCtaStatus
  effectiveTierSlug: MembershipPlanSlug | null
  hasPersonalBilling: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  scheduledPlanSlug: MembershipPlanSlug | null
  scheduledPlanName: string | null
  organizationName: string | null
}

export type MembershipPlanCardView = {
  planSlug: MembershipPlanSlug
  kind: MembershipPlanCtaKind
  isCurrent: boolean
  badge: string | null
  sourceLabel: string | null
  statusNote: string | null
  ctaLabel: string
  ctaHref: string | null
  ctaDisabled: boolean
  allowsCheckout: boolean
  visuallyCurrent: boolean
}

function isMembershipPlanSlug(value: string | null | undefined): value is MembershipPlanSlug {
  return (
    value === "plan-1" || value === "plan-2" || value === "plan-3"
  )
}

export function shortPlanName(slug: string | null | undefined): string {
  if (isMembershipPlanSlug(slug)) {
    return MEMBERSHIP_PLAN_SHORT_NAMES[slug]
  }
  return "Membership"
}

export function isLiveMembershipAccess(status: string): boolean {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "cancel_at_period_end" ||
    status === "past_due"
  )
}

export function formatMembershipPeriodDate(value: string | null): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date)
}

function buildCheckoutHref(planSlug: MembershipPlanSlug): string {
  const search = new URLSearchParams({
    type: "membership",
    planSlug,
    interval: "monthly",
  })
  return `/checkout/consent?${search.toString()}`
}

function buildDowngradeHref(planSlug: MembershipPlanSlug): string {
  const search = new URLSearchParams({
    downgrade: planSlug,
  })
  return `/dashboard/account?${search.toString()}`
}

function currentCardSourceLabel(facts: MembershipPlanCtaFacts): string | null {
  if (facts.source === "nonprofit_sponsored") {
    return facts.organizationName
      ? `Sponsored membership · ${facts.organizationName}`
      : "Sponsored membership"
  }

  if (facts.source === "complimentary") {
    return "Current complimentary plan"
  }

  return null
}

function currentCardStatusNote(facts: MembershipPlanCtaFacts): string | null {
  const periodEnd = formatMembershipPeriodDate(facts.currentPeriodEnd)

  if (facts.scheduledPlanName || facts.scheduledPlanSlug) {
    const target =
      facts.scheduledPlanName ?? shortPlanName(facts.scheduledPlanSlug)
    return periodEnd
      ? `Scheduled change to ${target} on ${periodEnd}.`
      : `Scheduled change to ${target} at period end.`
  }

  if (facts.cancelAtPeriodEnd || facts.status === "cancel_at_period_end") {
    return periodEnd
      ? `Cancellation scheduled — access continues until ${periodEnd}.`
      : "Cancellation scheduled — access continues until period end."
  }

  return null
}

/**
 * Maps trusted server membership facts to a single plan card presentation.
 */
export function buildMembershipPlanCardView(
  planSlug: MembershipPlanSlug,
  facts: MembershipPlanCtaFacts
): MembershipPlanCardView {
  const shortName = MEMBERSHIP_PLAN_SHORT_NAMES[planSlug]
  const joinHref = buildCheckoutHref(planSlug)

  if (!facts.isAuthenticated || !facts.effectiveTierSlug || !isLiveMembershipAccess(facts.status)) {
    return {
      planSlug,
      kind: "join",
      isCurrent: false,
      badge: null,
      sourceLabel: null,
      statusNote: null,
      ctaLabel: `Join Elevate ${shortName}`,
      ctaHref: joinHref,
      ctaDisabled: false,
      allowsCheckout: true,
      visuallyCurrent: false,
    }
  }

  const currentRank = MEMBERSHIP_PLAN_RANK[facts.effectiveTierSlug]
  const cardRank = MEMBERSHIP_PLAN_RANK[planSlug]
  const isCurrent = planSlug === facts.effectiveTierSlug

  if (isCurrent) {
    const sourceLabel = currentCardSourceLabel(facts)
    const badge =
      facts.source === "complimentary"
        ? "Current complimentary plan"
        : facts.source === "nonprofit_sponsored"
          ? "Sponsored membership"
          : "Current plan"

    return {
      planSlug,
      kind: "current",
      isCurrent: true,
      badge,
      sourceLabel,
      statusNote: currentCardStatusNote(facts),
      ctaLabel: "Go to my membership",
      ctaHref: MEMBERSHIP_HOME_PATH,
      ctaDisabled: false,
      allowsCheckout: false,
      visuallyCurrent: true,
    }
  }

  if (cardRank > currentRank) {
    return {
      planSlug,
      kind: "upgrade",
      isCurrent: false,
      badge: null,
      sourceLabel: null,
      statusNote: null,
      ctaLabel: `Upgrade to ${shortName}`,
      ctaHref: joinHref,
      ctaDisabled: false,
      allowsCheckout: true,
      visuallyCurrent: false,
    }
  }

  // Lower plan than current.
  if (!facts.hasPersonalBilling) {
    return {
      planSlug,
      kind: "unavailable",
      isCurrent: false,
      badge: null,
      sourceLabel: null,
      statusNote:
        facts.source === "nonprofit_sponsored"
          ? "Personal downgrades are not available on sponsored access."
          : "Plan changes for complimentary access are managed by administrators.",
      ctaLabel: `Elevate ${shortName}`,
      ctaHref: null,
      ctaDisabled: true,
      allowsCheckout: false,
      visuallyCurrent: false,
    }
  }

  const scheduledMatches =
    facts.scheduledPlanSlug === planSlug ||
    (facts.scheduledPlanName != null &&
      facts.scheduledPlanName.toLowerCase().includes(shortName.toLowerCase()))

  if (scheduledMatches) {
    const periodEnd = formatMembershipPeriodDate(facts.currentPeriodEnd)
    return {
      planSlug,
      kind: "downgrade_scheduled",
      isCurrent: false,
      badge: "Scheduled",
      sourceLabel: null,
      statusNote: periodEnd
        ? `Downgrade to ${shortName} takes effect on ${periodEnd}.`
        : `Downgrade to ${shortName} is scheduled at period end.`,
      ctaLabel: `Downgrade scheduled`,
      ctaHref: null,
      ctaDisabled: true,
      allowsCheckout: false,
      visuallyCurrent: false,
    }
  }

  if (facts.cancelAtPeriodEnd || facts.status === "cancel_at_period_end") {
    return {
      planSlug,
      kind: "unavailable",
      isCurrent: false,
      badge: null,
      sourceLabel: null,
      statusNote: "A cancellation is already scheduled for your current plan.",
      ctaLabel: `Downgrade to ${shortName}`,
      ctaHref: null,
      ctaDisabled: true,
      allowsCheckout: false,
      visuallyCurrent: false,
    }
  }

  return {
    planSlug,
    kind: "downgrade",
    isCurrent: false,
    badge: null,
    sourceLabel: null,
    statusNote: null,
    ctaLabel: `Downgrade to ${shortName}`,
    ctaHref: buildDowngradeHref(planSlug),
    ctaDisabled: false,
    allowsCheckout: false,
    visuallyCurrent: false,
  }
}

export function buildAllMembershipPlanCardViews(
  facts: MembershipPlanCtaFacts
): MembershipPlanCardView[] {
  return MEMBERSHIP_PLAN_SLUGS.map((slug) =>
    buildMembershipPlanCardView(slug, facts)
  )
}

export function emptyMembershipPlanCtaFacts(
  isAuthenticated: boolean
): MembershipPlanCtaFacts {
  return {
    isAuthenticated,
    source: "none",
    status: "none",
    effectiveTierSlug: null,
    hasPersonalBilling: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    scheduledPlanSlug: null,
    scheduledPlanName: null,
    organizationName: null,
  }
}

/**
 * Maps server EffectiveMembership-shaped fields into pricing CTA facts.
 * Call only with values from getEffectiveMembership — never browser input.
 */
export function membershipPlanCtaFactsFromEffective(input: {
  isAuthenticated: boolean
  source: MembershipCtaAccessSource
  status: MembershipCtaStatus
  effectiveTierSlug: string | null
  hasPersonalBilling: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  scheduledPlanSlug: string | null
  scheduledPlanName: string | null
  organizationName: string | null
}): MembershipPlanCtaFacts {
  if (!input.isAuthenticated) {
    return emptyMembershipPlanCtaFacts(false)
  }

  return {
    isAuthenticated: true,
    source: input.source,
    status: input.status,
    effectiveTierSlug: isMembershipPlanSlug(input.effectiveTierSlug)
      ? input.effectiveTierSlug
      : null,
    hasPersonalBilling: input.hasPersonalBilling,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    currentPeriodEnd: input.currentPeriodEnd,
    scheduledPlanSlug: isMembershipPlanSlug(input.scheduledPlanSlug)
      ? input.scheduledPlanSlug
      : null,
    scheduledPlanName: input.scheduledPlanName,
    organizationName: input.organizationName,
  }
}
