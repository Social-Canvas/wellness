/**
 * Canonical Elevate individual membership pricing.
 * Amounts are the single source of truth for display savings math.
 * Checkout still resolves Stripe Prices server-side from plan_prices.
 */

import type { MembershipSlug } from "@/lib/constants/elevate-brand"

/** DB / Stripe metadata interval values. */
export type MembershipBillingInterval = "monthly" | "yearly"

/** Public URL query values (`billing=`). */
export type MembershipBillingUrlValue = "monthly" | "annual"

export type MembershipPriceQuote = {
  planSlug: MembershipSlug
  interval: MembershipBillingInterval
  amountCents: number
  currency: "usd"
  /** Primary display amount, e.g. "$500" or "$47". */
  primaryLabel: string
  /** Suffix after primary, e.g. "/ year" or "/ month". */
  cadenceSuffix: string
  /** Only set for yearly — e.g. "Equivalent to $41.67/month". */
  equivalentMonthlyLabel: string | null
  /** Only set for yearly — e.g. "Save $64 a year · 11%". */
  savingsBadge: string | null
  savingsCents: number | null
  savingsPercent: number | null
}

const MONTHLY_CENTS: Record<MembershipSlug, number> = {
  "plan-1": 4700,
  "plan-2": 9900,
  "plan-3": 14900,
}

const YEARLY_CENTS: Record<MembershipSlug, number> = {
  "plan-1": 50000,
  "plan-2": 100000,
  "plan-3": 150000,
}

/** Display percents approved with pricing (not recomputed float noise). */
const YEARLY_SAVINGS_PERCENT: Record<MembershipSlug, number> = {
  "plan-1": 11,
  "plan-2": 16,
  "plan-3": 16,
}

function formatUsdFromCents(cents: number): string {
  const dollars = cents / 100
  const hasCents = cents % 100 !== 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(dollars)
}

/** Monthly equivalent of annual — drop trailing .00 for whole dollars. */
function formatEquivalentMonthly(yearlyCents: number): string {
  const monthly = yearlyCents / 12 / 100
  const hasFraction = Math.round(monthly * 100) % 100 !== 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(monthly)
}

export function monthlyAmountCents(planSlug: MembershipSlug): number {
  return MONTHLY_CENTS[planSlug]
}

export function yearlyAmountCents(planSlug: MembershipSlug): number {
  return YEARLY_CENTS[planSlug]
}

export function yearlySavingsCents(planSlug: MembershipSlug): number {
  return MONTHLY_CENTS[planSlug] * 12 - YEARLY_CENTS[planSlug]
}

export function yearlySavingsPercent(planSlug: MembershipSlug): number {
  return YEARLY_SAVINGS_PERCENT[planSlug]
}

export function getMembershipPriceQuote(
  planSlug: MembershipSlug,
  interval: MembershipBillingInterval
): MembershipPriceQuote {
  if (interval === "monthly") {
    const amountCents = MONTHLY_CENTS[planSlug]
    return {
      planSlug,
      interval,
      amountCents,
      currency: "usd",
      primaryLabel: formatUsdFromCents(amountCents),
      cadenceSuffix: "/ month",
      equivalentMonthlyLabel: null,
      savingsBadge: null,
      savingsCents: null,
      savingsPercent: null,
    }
  }

  const amountCents = YEARLY_CENTS[planSlug]
  const savingsCents = yearlySavingsCents(planSlug)
  const savingsPercent = YEARLY_SAVINGS_PERCENT[planSlug]

  return {
    planSlug,
    interval,
    amountCents,
    currency: "usd",
    primaryLabel: formatUsdFromCents(amountCents),
    cadenceSuffix: "/ year",
    equivalentMonthlyLabel: `Equivalent to ${formatEquivalentMonthly(amountCents)}/month`,
    savingsBadge: `Save ${formatUsdFromCents(savingsCents)} a year · ${savingsPercent}%`,
    savingsCents,
    savingsPercent,
  }
}

export function billingIntervalLabel(
  interval: MembershipBillingInterval | null | undefined
): string | null {
  if (interval === "monthly") return "Monthly billing"
  if (interval === "yearly") return "Annual billing"
  return null
}

export const ANNUAL_BILLING_NOTE =
  "Annual plans are billed once per year and renew automatically unless cancelled." as const

export const MAX_ANNUAL_SAVINGS_PERCENT = 16 as const
