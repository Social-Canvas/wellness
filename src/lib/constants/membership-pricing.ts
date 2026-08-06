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
  /** Compact percent badge for yearly — e.g. "Save 11%". */
  savingsBadge: string | null
  /** Dollar savings supporting line — e.g. "Save $64 annually". */
  savingsAmountLabel: string | null
  /** monthly×12 formatted for comparison — e.g. "$564". */
  yearlyComparisonLabel: string | null
  /** Explains the comparison amount — e.g. "when paid monthly". */
  yearlyComparisonHint: string | null
  /**
   * Screen-reader summary of annual vs monthly-year cost.
   * Visual strikethrough must not be announced as the charged amount.
   */
  accessiblePriceSummary: string | null
  savingsCents: number | null
  savingsPercent: number | null
  /** monthly×12 in cents — yearly only. */
  yearlyComparisonCents: number | null
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

const YEARLY_COMPARISON_HINT = "when paid monthly" as const

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

/** Cost of 12 months at the monthly rate (not an old list price). */
export function yearlyComparisonCents(planSlug: MembershipSlug): number {
  return MONTHLY_CENTS[planSlug] * 12
}

export function yearlySavingsCents(planSlug: MembershipSlug): number {
  return yearlyComparisonCents(planSlug) - YEARLY_CENTS[planSlug]
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
      savingsAmountLabel: null,
      yearlyComparisonLabel: null,
      yearlyComparisonHint: null,
      accessiblePriceSummary: null,
      savingsCents: null,
      savingsPercent: null,
      yearlyComparisonCents: null,
    }
  }

  const amountCents = YEARLY_CENTS[planSlug]
  const comparisonCents = yearlyComparisonCents(planSlug)
  const savingsCents = yearlySavingsCents(planSlug)
  const savingsPercent = YEARLY_SAVINGS_PERCENT[planSlug]
  const primaryLabel = formatUsdFromCents(amountCents)
  const comparisonLabel = formatUsdFromCents(comparisonCents)
  const savingsDollars = formatUsdFromCents(savingsCents)

  return {
    planSlug,
    interval,
    amountCents,
    currency: "usd",
    primaryLabel,
    cadenceSuffix: "/ year",
    equivalentMonthlyLabel: `Equivalent to ${formatEquivalentMonthly(amountCents)}/month`,
    savingsBadge: `Save ${savingsPercent}%`,
    savingsAmountLabel: `Save ${savingsDollars} annually`,
    yearlyComparisonLabel: comparisonLabel,
    yearlyComparisonHint: YEARLY_COMPARISON_HINT,
    accessiblePriceSummary: `Annual price ${primaryLabel}. Compared with ${comparisonLabel} when paying monthly. Save ${savingsDollars}, or ${savingsPercent} percent.`,
    savingsCents,
    savingsPercent,
    yearlyComparisonCents: comparisonCents,
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
