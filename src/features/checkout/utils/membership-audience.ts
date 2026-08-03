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
    "Choose the membership option that fits you or your organization. Every active membership includes the Elevate course library, while additional privileges depend on the selected plan.",
  individuals: {
    heading: "Memberships for Individuals",
    description:
      "Choose the level of support and live-session access that fits your goals. All active tiers include the Elevate course library.",
  },
  nonprofit: {
    heading: "Memberships for Nonprofit Organizations",
    description:
      "Provide employees, volunteers or community members with individual Elevate accounts through a sponsored organization membership.",
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

/** Confirmed seat pricing is published as inquiry-only visual plans (no Checkout). */
export const NONPROFIT_PUBLIC_PRICING_CONFIRMED = true

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
 * Approved nonprofit seat plans — visual/inquiry only.
 * Do not wire these amounts to self-serve Checkout.
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

export const NONPROFIT_INQUIRY_CTA = "Request nonprofit membership information"

export const NONPROFIT_INQUIRY_HREF =
  "/private-events?intent=nonprofit-partnership" as const

export const NONPROFIT_SHARED_BENEFITS_TITLE =
  "Included with every nonprofit plan" as const

export const NONPROFIT_PLAN_CHOICE_HEADING =
  "Choose your organization size" as const

export const NONPROFIT_PLAN_CHOICE_DESCRIPTION =
  "Select the participant range that best matches your organization." as const

export const NONPROFIT_CUSTOM_PRICING_LABEL = "Custom pricing" as const

/** Shared benefits shown once above nonprofit plan cards (public language). */
export const NONPROFIT_MEMBERSHIP_BENEFITS = [
  "Individual member accounts",
  "Elevate course library",
  "Weekly live online sessions (Core-equivalent)",
  "Shared session recordings archive",
  "Breathwork and guided practices",
  "Organization administrator dashboard",
  "Seat invitations and member management",
] as const

/**
 * Nonprofit Small/Mid/Large/Enterprise control seats and billing only.
 * Sponsored content access is always Core-equivalent (plan-1 capabilities).
 */
export const NONPROFIT_BILLING_TIER_NOT_CONTENT_TIER = true as const

export const NONPROFIT_SUPPORTING_NOTE =
  "Every participant receives an individual account, while the nonprofit administrator manages invitations and available seats."
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

/** Inquiry URL for a nonprofit seat plan (never self-serve Checkout). */
export function buildNonprofitInquiryHref(plan: NonprofitPlanSlug): string {
  const params = new URLSearchParams({
    intent: "nonprofit-partnership",
    plan,
  })
  return `/private-events?${params.toString()}`
}
