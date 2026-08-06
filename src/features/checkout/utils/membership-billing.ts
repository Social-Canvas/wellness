/**
 * Public membership billing-interval URL helpers for /programs.
 * URL uses monthly|annual; DB/checkout use monthly|yearly.
 */

import type { MembershipBillingInterval } from "@/lib/constants/membership-pricing"

export const BILLING_QUERY_KEY = "billing" as const

export const BILLING_URL_VALUES = ["monthly", "annual"] as const

export type BillingUrlValue = (typeof BILLING_URL_VALUES)[number]

export const DEFAULT_BILLING_URL: BillingUrlValue = "monthly"

export const BILLING_TOGGLE_OPTIONS = [
  {
    id: "monthly" as const,
    label: "Monthly",
    panelHint: "Billed every month",
  },
  {
    id: "annual" as const,
    label: "Annual",
    panelHint: "Billed once per year",
  },
] as const

/** Compact helper under the billing toggle — no prices or savings. */
export const BILLING_HELPER_COPY = {
  monthly: "Billed monthly. Renews automatically until cancelled.",
  annual: "Billed once per year. Renews automatically until cancelled.",
} as const

/** Separate badge beside Annual — not part of the radio option name. */
export const ANNUAL_SAVINGS_BADGE_LABEL = "Save up to 16%" as const

export function isBillingUrlValue(
  value: string | null | undefined
): value is BillingUrlValue {
  return value === "monthly" || value === "annual"
}

/**
 * Normalize query param. Invalid / missing → monthly.
 */
export function parseBillingParam(
  value: string | string[] | null | undefined
): BillingUrlValue {
  const raw = Array.isArray(value) ? value[0] : value
  if (isBillingUrlValue(raw)) {
    return raw
  }
  return DEFAULT_BILLING_URL
}

export function billingUrlToInterval(
  value: BillingUrlValue
): MembershipBillingInterval {
  return value === "annual" ? "yearly" : "monthly"
}

export function billingIntervalToUrl(
  interval: MembershipBillingInterval
): BillingUrlValue {
  return interval === "yearly" ? "annual" : "monthly"
}

/**
 * Checkout / DB interval from a loose string (URL annual or yearly).
 */
export function parseCheckoutBillingInterval(
  value: string | null | undefined
): MembershipBillingInterval {
  if (value === "yearly" || value === "annual") {
    return "yearly"
  }
  return "monthly"
}

/**
 * Build search string for a billing change while preserving unrelated params.
 */
export function buildMembershipBillingUrl(
  pathname: string,
  currentSearch: string | URLSearchParams,
  billing: BillingUrlValue,
  hash = "#memberships"
): string {
  const params =
    typeof currentSearch === "string"
      ? new URLSearchParams(
          currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch
        )
      : new URLSearchParams(currentSearch)

  params.set(BILLING_QUERY_KEY, billing)
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ""}${hash}`
}

export function billingFromLocationSearch(search: string): BillingUrlValue {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )
  return parseBillingParam(params.get(BILLING_QUERY_KEY))
}

export function nextBillingOnKey(
  current: BillingUrlValue,
  key: string,
  options: readonly { id: BillingUrlValue }[] = BILLING_TOGGLE_OPTIONS
): BillingUrlValue | null {
  const index = options.findIndex((option) => option.id === current)
  if (index < 0 || options.length === 0) {
    return null
  }

  switch (key) {
    case "ArrowLeft":
      return options[(index - 1 + options.length) % options.length]!.id
    case "ArrowRight":
      return options[(index + 1) % options.length]!.id
    case "Home":
      return options[0]!.id
    case "End":
      return options[options.length - 1]!.id
    case " ":
    case "Enter":
      // Toggle-style cadence control: Space/Enter flips selection.
      return options[(index + 1) % options.length]!.id
    default:
      return null
  }
}
