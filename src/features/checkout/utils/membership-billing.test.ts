import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  ANNUAL_BILLING_NOTE,
  getMembershipPriceQuote,
  yearlyComparisonCents,
  yearlySavingsCents,
  yearlySavingsPercent,
} from "../../../lib/constants/membership-pricing.ts"
import {
  ANNUAL_SAVINGS_BADGE_LABEL,
  BILLING_HELPER_COPY,
  BILLING_TOGGLE_OPTIONS,
  billingIntervalToUrl,
  billingUrlToInterval,
  buildMembershipBillingUrl,
  nextBillingOnKey,
  parseBillingParam,
  parseCheckoutBillingInterval,
} from "./membership-billing.ts"
import {
  buildMembershipPlanCardView,
  classifyMembershipBillingChange,
  emptyMembershipPlanCtaFacts,
  type MembershipPlanCtaFacts,
} from "./membership-plan-cta-state.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))

function readCheckoutSrc(relativeFromFeaturesCheckout: string): string {
  return readFileSync(
    join(__dirname, "..", relativeFromFeaturesCheckout),
    "utf8"
  )
}

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
  const quote = getMembershipPriceQuote("plan-1", "yearly")
  assert.equal(quote.savingsBadge, "Save 11%")
  assert.equal(quote.savingsAmountLabel, "Save $64 annually")
})

test("Gold annual saving is $188 and 16%", () => {
  assert.equal(yearlySavingsCents("plan-2"), 18800)
  assert.equal(yearlySavingsPercent("plan-2"), 16)
  assert.equal(getMembershipPriceQuote("plan-2", "yearly").savingsBadge, "Save 16%")
  assert.equal(
    getMembershipPriceQuote("plan-2", "yearly").savingsAmountLabel,
    "Save $188 annually"
  )
})

test("Platinum annual saving is $288 and 16%", () => {
  assert.equal(yearlySavingsCents("plan-3"), 28800)
  assert.equal(yearlySavingsPercent("plan-3"), 16)
  assert.equal(getMembershipPriceQuote("plan-3", "yearly").savingsBadge, "Save 16%")
  assert.equal(
    getMembershipPriceQuote("plan-3", "yearly").savingsAmountLabel,
    "Save $288 annually"
  )
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

test("Core comparison shows $564 from monthly × 12", () => {
  assert.equal(yearlyComparisonCents("plan-1"), 56400)
  const quote = getMembershipPriceQuote("plan-1", "yearly")
  assert.equal(quote.yearlyComparisonLabel, "$564")
  assert.equal(quote.yearlyComparisonHint, "when paid monthly")
})

test("Gold comparison shows $1,188 from monthly × 12", () => {
  assert.equal(yearlyComparisonCents("plan-2"), 118800)
  assert.equal(
    getMembershipPriceQuote("plan-2", "yearly").yearlyComparisonLabel,
    "$1,188"
  )
})

test("Platinum comparison shows $1,788 from monthly × 12", () => {
  assert.equal(yearlyComparisonCents("plan-3"), 178800)
  assert.equal(
    getMembershipPriceQuote("plan-3", "yearly").yearlyComparisonLabel,
    "$1,788"
  )
})

test("Accessible labels explain the annual comparison", () => {
  const core = getMembershipPriceQuote("plan-1", "yearly")
  assert.match(
    core.accessiblePriceSummary ?? "",
    /Annual price \$500\. Compared with \$564 when paying monthly\. Save \$64, or 11 percent\./
  )
  const gold = getMembershipPriceQuote("plan-2", "yearly")
  assert.match(
    gold.accessiblePriceSummary ?? "",
    /Annual price \$1,000\. Compared with \$1,188 when paying monthly\. Save \$188, or 16 percent\./
  )
  const platinum = getMembershipPriceQuote("plan-3", "yearly")
  assert.match(
    platinum.accessiblePriceSummary ?? "",
    /Annual price \$1,500\. Compared with \$1,788 when paying monthly\. Save \$288, or 16 percent\./
  )
})

test("Annual copy clearly says billed yearly", () => {
  assert.match(ANNUAL_BILLING_NOTE, /once per year/i)
  assert.doesNotMatch(ANNUAL_BILLING_NOTE, /billed monthly/i)
})

test("Monthly mode has no savings badge or comparison", () => {
  const quote = getMembershipPriceQuote("plan-2", "monthly")
  assert.equal(quote.primaryLabel, "$99")
  assert.equal(quote.cadenceSuffix, "/ month")
  assert.equal(quote.savingsBadge, null)
  assert.equal(quote.savingsAmountLabel, null)
  assert.equal(quote.yearlyComparisonLabel, null)
  assert.equal(quote.yearlyComparisonHint, null)
  assert.equal(quote.accessiblePriceSummary, null)
  assert.equal(quote.equivalentMonthlyLabel, null)
})

test("Monthly prices remain unchanged", () => {
  assert.equal(getMembershipPriceQuote("plan-1", "monthly").primaryLabel, "$47")
  assert.equal(getMembershipPriceQuote("plan-2", "monthly").primaryLabel, "$99")
  assert.equal(getMembershipPriceQuote("plan-3", "monthly").primaryLabel, "$149")
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

test("Toggle option labels are Monthly and Annual without embedded savings", () => {
  assert.deepEqual(
    BILLING_TOGGLE_OPTIONS.map((option) => option.label),
    ["Monthly", "Annual"]
  )
  assert.doesNotMatch(BILLING_TOGGLE_OPTIONS[1]!.label, /16%/)
  assert.equal(ANNUAL_SAVINGS_BADGE_LABEL, "Save up to 16%")
})

test("Toggle changes to Annual and URL updates to billing=annual", () => {
  assert.equal(nextBillingOnKey("monthly", "ArrowRight"), "annual")
  const url = buildMembershipBillingUrl(
    "/programs",
    "membership=individuals&utm_source=test",
    "annual"
  )
  assert.match(url, /billing=annual/)
  assert.match(url, /membership=individuals/)
  assert.match(url, /utm_source=test/)
})

test("Browser navigation can restore previous billing selection via URL", () => {
  const annualUrl = buildMembershipBillingUrl(
    "/programs",
    "membership=individuals",
    "annual"
  )
  const monthlyUrl = buildMembershipBillingUrl(
    "/programs",
    "membership=individuals&billing=annual",
    "monthly"
  )
  assert.equal(parseBillingParam(new URL(annualUrl, "https://example.com").searchParams.get("billing")), "annual")
  assert.equal(parseBillingParam(new URL(monthlyUrl, "https://example.com").searchParams.get("billing")), "monthly")
})

test("Monthly and Annual helper copy render correctly", () => {
  assert.equal(
    BILLING_HELPER_COPY.monthly,
    "Billed monthly. Renews automatically until cancelled."
  )
  assert.equal(
    BILLING_HELPER_COPY.annual,
    "Billed once per year. Renews automatically until cancelled."
  )
  assert.doesNotMatch(BILLING_HELPER_COPY.monthly, /\$|16%|Save/)
  assert.doesNotMatch(BILLING_HELPER_COPY.annual, /\$|16%|Save/)
})

test("Savings badge is separate from the toggle control", () => {
  const toggle = readCheckoutSrc("components/membership-billing-toggle.tsx")
  assert.match(toggle, /ANNUAL_SAVINGS_BADGE_LABEL/)
  assert.match(toggle, /aria-hidden="true"/)
  assert.match(toggle, /role="radiogroup"/)
  assert.match(toggle, /aria-label="Billing frequency"/)
  assert.match(toggle, /role="radio"/)
  assert.match(toggle, /aria-checked=/)
  assert.match(toggle, /BILLING_HELPER_COPY/)
  assert.doesNotMatch(toggle, /Annual — Save/)
  assert.match(toggle, /motion-reduce:transition-none/)
  assert.match(toggle, /duration-200/)
  assert.match(toggle, /min-h-11/)
  assert.match(toggle, /sm:flex-row/)
})

test("Keyboard selection works for billing cadence", () => {
  assert.equal(nextBillingOnKey("monthly", "ArrowRight"), "annual")
  assert.equal(nextBillingOnKey("annual", "ArrowLeft"), "monthly")
  assert.equal(nextBillingOnKey("monthly", " "), "annual")
  assert.equal(nextBillingOnKey("annual", "Enter"), "monthly")
  assert.equal(nextBillingOnKey("annual", "Home"), "monthly")
  assert.equal(nextBillingOnKey("monthly", "End"), "annual")
})

test("Billing sync preserves popstate URL restoration without Stripe Price IDs", () => {
  const toggle = readCheckoutSrc("components/membership-billing-toggle.tsx")
  assert.match(toggle, /popstate/)
  assert.match(toggle, /history\.pushState/)
  assert.match(toggle, /parseBillingParam/)
  assert.doesNotMatch(toggle, /price_/)

  const cards = readCheckoutSrc("components/membership-pricing-cards.tsx")
  assert.doesNotMatch(cards, /price_/)
  assert.match(cards, /MembershipBillingToggle/)
})

test("Annual pricing cards highlight savings with monthly comparison", () => {
  const cards = readCheckoutSrc("components/membership-pricing-cards.tsx")
  assert.match(cards, /yearlyComparisonLabel/)
  assert.match(cards, /yearlyComparisonHint/)
  assert.match(cards, /accessiblePriceSummary/)
  assert.match(cards, /savingsAmountLabel/)
  assert.match(cards, /<del/)
  assert.match(cards, /aria-hidden/)
  assert.match(cards, /sr-only/)
  assert.match(cards, /flex-wrap/)
  assert.match(cards, /min-w-0/)
  assert.match(cards, /shrink-0/)
  assert.doesNotMatch(cards, /price_/)
  assert.doesNotMatch(cards, /STRIPE/)
})

test("Stripe and Checkout behavior remain interval-based without Price IDs", () => {
  const cards = readCheckoutSrc("components/membership-pricing-cards.tsx")
  assert.match(cards, /interval=/)
  assert.match(cards, /planSlug=/)
  assert.doesNotMatch(cards, /price_/)

  const available = buildMembershipPlanCardView(
    "plan-1",
    { ...emptyMembershipPlanCtaFacts(false), yearlyCheckoutAvailable: true },
    "yearly"
  )
  assert.ok(available.ctaHref)
  assert.match(available.ctaHref, /interval=yearly/)
  assert.doesNotMatch(available.ctaHref, /price_/)
})

test("Audience tabs remain primary tabs and are not a billing switch", () => {
  const tabs = readCheckoutSrc("components/membership-audience-tabs.tsx")
  assert.match(tabs, /role="tablist"/)
  assert.match(tabs, /aria-label="Membership audience"/)
  assert.match(tabs, /max-w-\[34rem\]/)
  assert.match(tabs, /\.get\("membership"\)/)
  assert.match(tabs, /buildMembershipAudienceUrl/)
  assert.doesNotMatch(tabs, /Billing frequency/)
})
