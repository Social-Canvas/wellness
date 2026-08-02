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

/** Confirmed seat pricing is not published on main — inquiry overview only. */
export const NONPROFIT_PUBLIC_PRICING_CONFIRMED = false

export const NONPROFIT_INQUIRY_CTA = "Request nonprofit membership information"

export const NONPROFIT_INQUIRY_HREF =
  "/private-events?intent=nonprofit-partnership" as const

/** Plain-language nonprofit benefits (no capability-table jargon). */
export const NONPROFIT_MEMBERSHIP_BENEFITS = [
  "Individual member accounts — no shared organization login",
  "Shared Elevate course library (same content as individual memberships)",
  "Organization administrator dashboard",
  "Seat invitations and member management",
  "Member statuses: active, invited, suspended, and removed",
  "Membership privileges based on the assigned plan",
  "Upgrade and downgrade support",
  "In-person eligibility based on the assigned membership level",
] as const

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
