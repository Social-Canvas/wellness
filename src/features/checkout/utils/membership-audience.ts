/**
 * Public membership audience tab model for /programs.
 * Pure helpers — safe for unit tests and Client Components.
 */

export const MEMBERSHIP_QUERY_KEY = "membership" as const

export const MEMBERSHIP_AUDIENCE_IDS = ["individuals", "nonprofit"] as const

export type MembershipAudienceId = (typeof MEMBERSHIP_AUDIENCE_IDS)[number]

export const DEFAULT_MEMBERSHIP_AUDIENCE: MembershipAudienceId = "individuals"

export const MEMBERSHIP_SECTION_COPY = {
  eyebrow: "Memberships",
  title: "Elevate Memberships",
  subtitle:
    "Choose an individual membership or explore sponsored access for nonprofit organizations.",
  individuals: {
    heading: "Memberships for Individuals",
    description:
      "All active tiers include the Elevate course library. Choose the level of live-session access and support that fits your goals.",
  },
  nonprofit: {
    heading: "Memberships for Nonprofit Organizations",
    description:
      "Provide employees, volunteers, or community members with individual Elevate accounts through a sponsored nonprofit partnership.",
  },
} as const

export const MEMBERSHIP_TABS = [
  {
    id: "individuals" as const,
    label: "Individuals",
    panelId: "membership-panel-individuals",
    tabId: "membership-tab-individuals",
  },
  {
    id: "nonprofit" as const,
    label: "Nonprofit Organizations",
    panelId: "membership-panel-nonprofit",
    tabId: "membership-tab-nonprofit",
  },
] as const

/**
 * Historical seat-band pricing retained for internal enquiry metadata / existing records.
 * Not shown on the public nonprofit panel.
 */
export const NONPROFIT_PUBLIC_PRICING_CONFIRMED = false

export const NONPROFIT_PLAN_SLUGS = [
  "small",
  "mid-size",
  "large",
  "enterprise",
] as const

export type NonprofitPlanSlug = (typeof NONPROFIT_PLAN_SLUGS)[number]

export type NonprofitSeatPlan = {
  slug: NonprofitPlanSlug
  name: string
  seatRangeLabel: string
  priceLabel: string
  priceSuffix: string
  ctaLabel: string
  customPricing: boolean
}

/**
 * Historical nonprofit seat bands — enquiry metadata / admin reference only.
 * Do not render as public pricing cards. Do not wire to Checkout.
 */
export const NONPROFIT_SEAT_PLANS: readonly NonprofitSeatPlan[] = [
  {
    slug: "small",
    name: "Small Organization",
    seatRangeLabel: "1–25 participants",
    priceLabel: "$497",
    priceSuffix: "/ month",
    ctaLabel: "Request this plan",
    customPricing: false,
  },
  {
    slug: "mid-size",
    name: "Mid-Size Organization",
    seatRangeLabel: "26–75 participants",
    priceLabel: "$997",
    priceSuffix: "/ month",
    ctaLabel: "Request this plan",
    customPricing: false,
  },
  {
    slug: "large",
    name: "Large Organization",
    seatRangeLabel: "76–200 participants",
    priceLabel: "$1,997",
    priceSuffix: "/ month",
    ctaLabel: "Request this plan",
    customPricing: false,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    seatRangeLabel: "201+ participants",
    priceLabel: "$3,000–$5,000",
    priceSuffix: "/ month",
    ctaLabel: "Discuss enterprise access",
    customPricing: true,
  },
] as const

export const NONPROFIT_INQUIRY_CTA = "Connect with us"

export const NONPROFIT_INQUIRY_HREF =
  "/private-events?intent=nonprofit-partnership" as const

export const NONPROFIT_SHARED_BENEFITS_TITLE =
  "Included with a nonprofit partnership" as const

export const NONPROFIT_MISSION_EYEBROW = "OUR BELIEF" as const

export const NONPROFIT_MISSION_HEADING =
  "A world where healing belongs to everyone" as const

export const NONPROFIT_MISSION_BODY =
  "At Elevate, we believe access to peace, resilience, and well-being should not depend on privilege or circumstance. Dr. Deepa Pattani created Elevate’s nonprofit partnerships to help organizations bring supportive, restorative experiences to the people and communities they serve—making meaningful care and connection more accessible to all." as const

/** @deprecated Public size cards removed — kept for test migration detection. */
export const NONPROFIT_PLAN_CHOICE_HEADING =
  "Choose your organization size" as const

/** @deprecated Public size cards removed. */
export const NONPROFIT_PLAN_CHOICE_DESCRIPTION =
  "Select the participant range that best matches your organization." as const

export const NONPROFIT_CUSTOM_PRICING_LABEL = "Custom pricing" as const

/**
 * Shared partnership benefits. Platinum-aligned public language derived from the
 * approved Platinum feature list where practical (no duplicated capability keys).
 */
export function buildNonprofitMembershipBenefits(
  platinumFeatures: readonly string[] = []
): readonly string[] {
  // Platinum features are resolved where practical by callers; defaults mirror
  // the approved Elevate Platinum public configuration without importing plan
  // constants (keeps this module path-alias-free for Node unit tests).
  void platinumFeatures
  return [
    "Elevate course and recorded-session library",
    "Access to live virtual classes",
    "Platinum-equivalent membership privileges",
    "Included in-person experience according to the current Platinum configuration",
    "Individual participant accounts",
    "Organization administrator dashboard",
    "Seat and member management",
    "Integration Journal",
  ]
}

export const NONPROFIT_MEMBERSHIP_BENEFITS = buildNonprofitMembershipBenefits()

/**
 * Nonprofit seat counts control capacity only.
 * Sponsored content access is Platinum-equivalent (plan-3 capabilities).
 */
export const NONPROFIT_BILLING_TIER_NOT_CONTENT_TIER = true as const

export const NONPROFIT_SUPPORTING_NOTE =
  "Every participant receives an individual account. After approval, your organization receives one reusable access code and manages seats from the administrator dashboard."

export const SPONSORED_BILLING_COPY =
  "Billing is managed by your nonprofit sponsor. Contact your administrator for seat or plan changes."

/** Forbidden public placeholder — unconfirmed Platinum benefits must be omitted. */
export const PLATINUM_PLACEHOLDER_COPY =
  "Additional Platinum privileges configurable"

export function isMembershipAudienceId(
  value: string | null | undefined
): value is MembershipAudienceId {
  return (
    value === "individuals" ||
    value === "nonprofit"
  )
}

/**
 * Normalize query param to a valid audience. Invalid / missing → individuals.
 */
export function parseMembershipAudienceParam(
  value: string | string[] | null | undefined
): MembershipAudienceId {
  const raw = Array.isArray(value) ? value[0] : value
  if (isMembershipAudienceId(raw)) {
    return raw
  }
  return DEFAULT_MEMBERSHIP_AUDIENCE
}

/**
 * Build search string for a tab change while preserving unrelated params.
 */
export function buildMembershipAudienceUrl(
  pathname: string,
  currentSearch: string | URLSearchParams,
  audience: MembershipAudienceId,
  hash = "#memberships"
): string {
  const params =
    typeof currentSearch === "string"
      ? new URLSearchParams(
          currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch
        )
      : new URLSearchParams(currentSearch)

  params.set(MEMBERSHIP_QUERY_KEY, audience)
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ""}${hash}`
}

export function audienceFromLocationSearch(
  search: string
): MembershipAudienceId {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )
  return parseMembershipAudienceParam(params.get(MEMBERSHIP_QUERY_KEY))
}

/**
 * Keyboard navigation for a horizontal tablist (Left/Right/Home/End).
 * Returns the next audience id, or null if the key is not handled.
 */
export function nextAudienceOnKey(
  current: MembershipAudienceId,
  key: string,
  tabs: readonly { id: MembershipAudienceId }[] = MEMBERSHIP_TABS
): MembershipAudienceId | null {
  const index = tabs.findIndex((tab) => tab.id === current)
  if (index < 0 || tabs.length === 0) {
    return null
  }

  switch (key) {
    case "ArrowLeft":
      return tabs[(index - 1 + tabs.length) % tabs.length]!.id
    case "ArrowRight":
      return tabs[(index + 1) % tabs.length]!.id
    case "Home":
      return tabs[0]!.id
    case "End":
      return tabs[tabs.length - 1]!.id
    default:
      return null
  }
}

export function isPanelVisible(
  active: MembershipAudienceId,
  panel: MembershipAudienceId
): boolean {
  return active === panel
}

export function isNonprofitPlanSlug(
  value: string | null | undefined
): value is NonprofitPlanSlug {
  return (
    value === "small" ||
    value === "mid-size" ||
    value === "large" ||
    value === "enterprise"
  )
}

/**
 * Normalize nonprofit plan query param. Invalid / missing → null (ignored safely).
 * Retained for legacy links; public UI no longer uses plan= deep-links.
 */
export function parseNonprofitPlanParam(
  value: string | string[] | null | undefined
): NonprofitPlanSlug | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (isNonprofitPlanSlug(raw)) {
    return raw
  }
  return null
}

/** Common partnership enquiry URL (never self-serve Checkout; no plan=). */
export function buildNonprofitInquiryHref(
  _plan?: NonprofitPlanSlug | null
): string {
  void _plan
  return NONPROFIT_INQUIRY_HREF
}
