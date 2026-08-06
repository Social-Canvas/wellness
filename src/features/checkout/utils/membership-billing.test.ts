import assert from "node:assert/strict"
import { test } from "node:test"

import {
  ANNUAL_BILLING_NOTE,
  getMembershipPriceQuote,
  yearlySavingsCents,
  yearlySavingsPercent,
} from "../../../lib/constants/membership-pricing.ts"
import {
  billingIntervalToUrl,
  billingUrlToInterval,
  buildMembershipBillingUrl,
  parseBillingParam,
  parseCheckoutBillingInterval,
} from "./membership-billing.ts"
import {
  buildMembershipPlanCardView,
  classifyMembershipBillingChange,
  emptyMembershipPlanCtaFacts,
  type MembershipPlanCtaFacts,
} from "./membership-plan-cta-state.ts"

function personalFacts(
  overrides: Partial<MembershipPlanCtaFacts> = {}
): MembershipPlanCtaFacts {
  return {
    isAuthenticated: true,
    source: "personal_stripe",
    status: "active",
    effectiveTierSlug: "plan-1",
    billingInterval: "monthly",
    hasPersonalBilling: true,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2026-09-01T00:00:00.000Z",
    scheduledPlanSlug: null,
    scheduledPlanName: null,
    scheduledBillingInterval: null,
    organizationName: null,
    yearlyCheckoutAvailable: true,
    ...overrides,
  }
}

test("Monthly is selected by default", () => {
  assert.equal(parseBillingParam(undefined), "monthly")
  assert.equal(parseBillingParam(null), "monthly")
})

test("Annual URL state works", () => {
  assert.equal(parseBillingParam("annual"), "annual")
  assert.equal(billingUrlToInterval("annual"), "yearly")
  assert.equal(billingIntervalToUrl("yearly"), "annual")
  const url = buildMembershipBillingUrl(
    "/programs",
    "membership=individuals",
    "annual"
  )
  assert.match(url, /billing=annual/)
  assert.match(url, /membership=individuals/)
  assert.match(url, /#memberships/)
})

test("Invalid billing value falls back to monthly", () => {
  assert.equal(parseBillingParam("weekly"), "monthly")
  assert.equal(parseBillingParam("YEARLY"), "monthly")
  assert.equal(parseCheckoutBillingInterval("annual"), "yearly")
  assert.equal(parseCheckoutBillingInterval("bogus"), "monthly")
})

test("Core annual shows $500", () => {
  const quote = getMembershipPriceQuote("plan-1", "yearly")
  assert.equal(quote.primaryLabel, "$500")
  assert.equal(quote.amountCents, 50000)
  assert.equal(quote.cadenceSuffix, "/ year")
})

test("Gold annual shows $1,000", () => {
  const quote = getMembershipPriceQuote("plan-2", "yearly")
  assert.equal(quote.primaryLabel, "$1,000")
  assert.equal(quote.amountCents, 100000)
})

test("Platinum annual shows $1,500", () => {
  const quote = getMembershipPriceQuote("plan-3", "yearly")
  assert.equal(quote.primaryLabel, "$1,500")
  assert.equal(quote.amountCents, 150000)
})

test("Core annual saving is $64 and 11%", () => {
  assert.equal(yearlySavingsCents("plan-1"), 6400)
  assert.equal(yearlySavingsPercent("plan-1"), 11)
  assert.match(
    getMembershipPriceQuote("plan-1", "yearly").savingsBadge ?? "",
    /Save \$64 a year · 11%/
  )
})

test("Gold annual saving is $188 and 16%", () => {
  assert.equal(yearlySavingsCents("plan-2"), 18800)
  assert.equal(yearlySavingsPercent("plan-2"), 16)
})

test("Platinum annual saving is $288 and 16%", () => {
  assert.equal(yearlySavingsCents("plan-3"), 28800)
  assert.equal(yearlySavingsPercent("plan-3"), 16)
})

test("Annual equivalent monthly values are correct", () => {
  assert.equal(
    getMembershipPriceQuote("plan-1", "yearly").equivalentMonthlyLabel,
    "Equivalent to $41.67/month"
  )
  assert.equal(
    getMembershipPriceQuote("plan-2", "yearly").equivalentMonthlyLabel,
    "Equivalent to $83.33/month"
  )
  assert.equal(
    getMembershipPriceQuote("plan-3", "yearly").equivalentMonthlyLabel,
    "Equivalent to $125/month"
  )
})

test("Annual copy clearly says billed yearly", () => {
  assert.match(ANNUAL_BILLING_NOTE, /once per year/i)
  assert.doesNotMatch(ANNUAL_BILLING_NOTE, /billed monthly/i)
})

test("Monthly mode has no savings badge", () => {
  assert.equal(getMembershipPriceQuote("plan-2", "monthly").savingsBadge, null)
})

test("Current annual plan never starts duplicate Checkout", () => {
  const view = buildMembershipPlanCardView(
    "plan-2",
    personalFacts({
      effectiveTierSlug: "plan-2",
      billingInterval: "yearly",
    }),
    "yearly"
  )
  assert.equal(view.kind, "current")
  assert.equal(view.allowsCheckout, false)
  assert.doesNotMatch(view.ctaHref ?? "", /checkout/)
})

test("Monthly member viewing annual sees Switch to annual", () => {
  const view = buildMembershipPlanCardView(
    "plan-1",
    personalFacts({ billingInterval: "monthly" }),
    "yearly"
  )
  assert.equal(view.kind, "switch_cadence")
  assert.equal(view.ctaLabel, "Switch to annual")
})

test("Annual member viewing monthly sees Switch to monthly scheduled", () => {
  const view = buildMembershipPlanCardView(
    "plan-1",
    personalFacts({ billingInterval: "yearly" }),
    "monthly"
  )
  assert.equal(view.kind, "switch_cadence")
  assert.equal(view.ctaLabel, "Switch to monthly")
  assert.match(view.statusNote ?? "", /change to monthly/i)
})

test("Monthly → annual waits for successful payment classification", () => {
  assert.equal(
    classifyMembershipBillingChange({
      currentPlanSlug: "plan-1",
      currentInterval: "monthly",
      targetPlanSlug: "plan-1",
      targetInterval: "yearly",
    }),
    "immediate"
  )
})

test("Annual → monthly is scheduled at period end", () => {
  assert.equal(
    classifyMembershipBillingChange({
      currentPlanSlug: "plan-3",
      currentInterval: "yearly",
      targetPlanSlug: "plan-3",
      targetInterval: "monthly",
    }),
    "period_end"
  )
})

test("Tier downgrade remains scheduled", () => {
  assert.equal(
    classifyMembershipBillingChange({
      currentPlanSlug: "plan-3",
      currentInterval: "monthly",
      targetPlanSlug: "plan-1",
      targetInterval: "yearly",
    }),
    "period_end"
  )
})

test("Monthly Core → Annual Gold is immediate", () => {
  assert.equal(
    classifyMembershipBillingChange({
      currentPlanSlug: "plan-1",
      currentInterval: "monthly",
      targetPlanSlug: "plan-2",
      targetInterval: "yearly",
    }),
    "immediate"
  )
})

test("Sponsored users have no cadence-switch controls", () => {
  const view = buildMembershipPlanCardView(
    "plan-1",
    personalFacts({
      source: "nonprofit_sponsored",
      hasPersonalBilling: false,
      billingInterval: null,
      organizationName: "Example Org",
    }),
    "yearly"
  )
  assert.equal(view.kind, "current")
  assert.equal(view.allowsCheckout, false)
})

test("Complimentary users have no cadence-switch controls", () => {
  const view = buildMembershipPlanCardView(
    "plan-2",
    personalFacts({
      source: "complimentary",
      hasPersonalBilling: false,
      billingInterval: null,
      effectiveTierSlug: "plan-2",
    }),
    "monthly"
  )
  assert.equal(view.kind, "current")
  assert.match(view.badge ?? "", /complimentary/i)
})

test("Missing annual config disables yearly checkout only", () => {
  const join = buildMembershipPlanCardView(
    "plan-1",
    emptyMembershipPlanCtaFacts(false),
    "yearly"
  )
  assert.equal(join.allowsCheckout, false)
  assert.equal(join.ctaDisabled, true)

  const monthly = buildMembershipPlanCardView(
    "plan-1",
    {
      ...emptyMembershipPlanCtaFacts(false),
      yearlyCheckoutAvailable: true,
    },
    "monthly"
  )
  assert.equal(monthly.allowsCheckout, true)
})

test("Browser cannot provide a Stripe Price ID via CTA href", () => {
  const view = buildMembershipPlanCardView(
    "plan-2",
    emptyMembershipPlanCtaFacts(false),
    "yearly"
  )
  // yearlyCheckoutAvailable defaults false on empty facts
  assert.equal(view.ctaHref, null)
  const available = buildMembershipPlanCardView(
    "plan-2",
    { ...emptyMembershipPlanCtaFacts(false), yearlyCheckoutAvailable: true },
    "yearly"
  )
  assert.ok(available.ctaHref)
  assert.doesNotMatch(available.ctaHref, /price_/)
  assert.match(available.ctaHref, /interval=yearly/)
  assert.match(available.ctaHref, /planSlug=plan-2/)
})
