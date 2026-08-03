import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import {
  ELEVATE_MEMBERSHIPS,
  MEMBERSHIP_AUDIENCES,
} from "../../../lib/constants/elevate-brand.ts"
import { buildCheckoutConsentUrl } from "../utils/checkout-urls.ts"
import {
  DEFAULT_MEMBERSHIP_AUDIENCE,
  MEMBERSHIP_SECTION_COPY,
  MEMBERSHIP_TABS,
  NONPROFIT_CUSTOM_PRICING_LABEL,
  NONPROFIT_INQUIRY_HREF,
  NONPROFIT_MEMBERSHIP_BENEFITS,
  NONPROFIT_PLAN_CHOICE_DESCRIPTION,
  NONPROFIT_PLAN_CHOICE_HEADING,
  NONPROFIT_PUBLIC_PRICING_CONFIRMED,
  NONPROFIT_SEAT_PLANS,
  NONPROFIT_SHARED_BENEFITS_TITLE,
  NONPROFIT_SUPPORTING_NOTE,
  PLATINUM_PLACEHOLDER_COPY,
  SPONSORED_BILLING_COPY,
  audienceFromLocationSearch,
  buildMembershipAudienceUrl,
  buildNonprofitInquiryHref,
  isPanelVisible,
  nextAudienceOnKey,
  parseMembershipAudienceParam,
  parseNonprofitPlanParam,
} from "./membership-audience.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function nonprofitPanelSource(): string {
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  const start = component.indexOf("function NonprofitMembershipPlans")
  assert.ok(start >= 0, "NonprofitMembershipPlans not found")
  return component.slice(start)
}

// 1. Shared benefits render once
test("1. Shared benefits render once", () => {
  const panel = nonprofitPanelSource()
  assert.equal(NONPROFIT_SHARED_BENEFITS_TITLE, "Included with every nonprofit plan")
  assert.match(panel, /NONPROFIT_SHARED_BENEFITS_TITLE/)
  assert.match(panel, /nonprofit-shared-benefits-heading/)
  assert.equal(
    (panel.match(/NONPROFIT_MEMBERSHIP_BENEFITS\.map/g) ?? []).length,
    1
  )
  assert.match(panel, /NONPROFIT_SUPPORTING_NOTE/)
  assert.equal(NONPROFIT_MEMBERSHIP_BENEFITS.length, 7)
})

// 2. Each shared benefit appears exactly once in the nonprofit panel
test("2. Each shared benefit appears exactly once in the nonprofit panel", () => {
  assert.deepEqual([...NONPROFIT_MEMBERSHIP_BENEFITS], [
    "Individual member accounts",
    "Elevate course library",
    "Weekly live online sessions (Core-equivalent)",
    "Shared session recordings archive",
    "Breathwork and guided practices",
    "Organization administrator dashboard",
    "Seat invitations and member management",
  ])
  const unique = new Set(NONPROFIT_MEMBERSHIP_BENEFITS)
  assert.equal(unique.size, NONPROFIT_MEMBERSHIP_BENEFITS.length)
  const panel = nonprofitPanelSource()
  assert.match(panel, /NONPROFIT_MEMBERSHIP_BENEFITS\.map/)
  assert.doesNotMatch(
    panel,
    /NONPROFIT_SEAT_PLANS\.map[\s\S]*NONPROFIT_MEMBERSHIP_BENEFITS\.map/
  )
})

// 3. Plan cards do not duplicate benefit lists
test("3. Plan cards do not duplicate benefit lists", () => {
  const panel = nonprofitPanelSource()
  const cardsStart = panel.indexOf("NONPROFIT_SEAT_PLANS.map")
  assert.ok(cardsStart >= 0)
  const cardsSection = panel.slice(cardsStart)
  assert.doesNotMatch(cardsSection, /NONPROFIT_MEMBERSHIP_BENEFITS/)
  assert.doesNotMatch(cardsSection, /Individual member accounts/)
  assert.match(panel, /NONPROFIT_PLAN_CHOICE_HEADING/)
  assert.equal(NONPROFIT_PLAN_CHOICE_HEADING, "Choose your organization size")
  assert.equal(
    NONPROFIT_PLAN_CHOICE_DESCRIPTION,
    "Select the participant range that best matches your organization."
  )
})

// 4. Four nonprofit plan cards render
test("4. Four nonprofit plan cards render", () => {
  assert.equal(NONPROFIT_PUBLIC_PRICING_CONFIRMED, true)
  assert.equal(NONPROFIT_SEAT_PLANS.length, 4)
  const panel = nonprofitPanelSource()
  assert.match(panel, /NONPROFIT_SEAT_PLANS\.map/)
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(component, /membership-panel-nonprofit/)
})

// 5. Small plan shows 1–25 and $497
test("5. Small plan shows 1–25 and $497", () => {
  const small = NONPROFIT_SEAT_PLANS.find((plan) => plan.slug === "small")
  assert.ok(small)
  assert.equal(small.name, "Small Organization")
  assert.equal(small.seatRangeLabel, "1–25 participants")
  assert.equal(small.priceLabel, "$497")
  assert.equal(small.ctaLabel, "Request this plan")
})

// 6. Mid-size shows 26–75 and $997
test("6. Mid-size shows 26–75 and $997", () => {
  const mid = NONPROFIT_SEAT_PLANS.find((plan) => plan.slug === "mid-size")
  assert.ok(mid)
  assert.equal(mid.name, "Mid-Size Organization")
  assert.equal(mid.seatRangeLabel, "26–75 participants")
  assert.equal(mid.priceLabel, "$997")
  assert.equal(mid.ctaLabel, "Request this plan")
})

// 7. Large shows 76–200 and $1,997
test("7. Large shows 76–200 and $1,997", () => {
  const large = NONPROFIT_SEAT_PLANS.find((plan) => plan.slug === "large")
  assert.ok(large)
  assert.equal(large.name, "Large Organization")
  assert.equal(large.seatRangeLabel, "76–200 participants")
  assert.equal(large.priceLabel, "$1,997")
  assert.equal(large.ctaLabel, "Request this plan")
})

// 8. Enterprise shows 201+ and $3,000–$5,000
test("8. Enterprise shows 201+ and $3,000–$5,000", () => {
  const enterprise = NONPROFIT_SEAT_PLANS.find(
    (plan) => plan.slug === "enterprise"
  )
  assert.ok(enterprise)
  assert.equal(enterprise.name, "Enterprise")
  assert.equal(enterprise.seatRangeLabel, "201+ participants")
  assert.equal(enterprise.priceLabel, "$3,000–$5,000")
  assert.equal(enterprise.ctaLabel, "Discuss enterprise access")
  assert.equal(enterprise.customPricing, true)
  assert.equal(NONPROFIT_CUSTOM_PRICING_LABEL, "Custom pricing")
  const panel = nonprofitPanelSource()
  assert.match(panel, /NONPROFIT_CUSTOM_PRICING_LABEL/)
})

// 9. Correct inquiry plan identifier is passed
test("9. Correct inquiry plan identifier is passed", () => {
  assert.deepEqual(
    NONPROFIT_SEAT_PLANS.map((plan) => plan.slug),
    ["small", "mid-size", "large", "enterprise"]
  )
  assert.equal(
    buildNonprofitInquiryHref("small"),
    "/private-events?intent=nonprofit-partnership&plan=small"
  )
  assert.equal(
    buildNonprofitInquiryHref("mid-size"),
    "/private-events?intent=nonprofit-partnership&plan=mid-size"
  )
  assert.equal(
    buildNonprofitInquiryHref("large"),
    "/private-events?intent=nonprofit-partnership&plan=large"
  )
  assert.equal(
    buildNonprofitInquiryHref("enterprise"),
    "/private-events?intent=nonprofit-partnership&plan=enterprise"
  )
  assert.equal(NONPROFIT_INQUIRY_HREF, "/private-events?intent=nonprofit-partnership")
  assert.equal(parseNonprofitPlanParam("orgs"), null)
  assert.equal(parseNonprofitPlanParam("mid"), null)
  const privateEvents = readSrc("app/(public)/private-events/page.tsx")
  assert.match(privateEvents, /parseNonprofitPlanParam/)
})

// 10. No nonprofit card starts Stripe Checkout
test("10. No nonprofit card starts Stripe Checkout", () => {
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(component, /buildNonprofitInquiryHref/)
  assert.doesNotMatch(
    component,
    /buildCheckoutConsentUrl|stripe\.checkout|\/checkout\/consent/
  )
  for (const plan of NONPROFIT_SEAT_PLANS) {
    const href = buildNonprofitInquiryHref(plan.slug)
    assert.match(href, /\/private-events/)
    assert.doesNotMatch(href, /\/checkout|consent/)
  }
  const audienceUtil = readSrc("features/checkout/utils/membership-audience.ts")
  assert.doesNotMatch(audienceUtil, /stripe\.|price_[A-Za-z0-9]/i)
})

// 11. Desktop supports four compact cards at wide widths
test("11. Desktop supports four compact cards at wide widths", () => {
  const panel = nonprofitPanelSource()
  assert.match(panel, /xl:grid-cols-4/)
  assert.match(panel, /max-w-\[1100px\]/)
})

// 12. Tablet uses a 2×2 layout
test("12. Tablet uses a 2×2 layout", () => {
  const panel = nonprofitPanelSource()
  assert.match(panel, /sm:grid-cols-2/)
  assert.match(
    panel,
    /grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4/
  )
})

// 13. Mobile uses one column
test("13. Mobile uses one column", () => {
  const panel = nonprofitPanelSource()
  assert.match(panel, /grid-cols-1/)
  assert.match(panel, /grid list-none grid-cols-1/)
})

// 14. No horizontal overflow
test("14. No horizontal overflow", () => {
  const page = readSrc("app/(public)/programs/page.tsx")
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(page, /overflow-x-hidden/)
  assert.match(component, /overflow-x-hidden/)
  assert.match(component, /max-w-full/)
  assert.match(component, /w-full max-w-\[1100px\]/)
})

// 15. Individual membership cards remain unchanged
test("15. Individual membership cards remain unchanged", () => {
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.name),
    ["Elevate Core", "Elevate Gold", "Elevate Platinum"]
  )
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.priceLabel),
    ["$47", "$99", "$149"]
  )
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.priceCents),
    [4700, 9900, 14900]
  )
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.match(page, /grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3/)
  assert.match(page, /Join \{tier\.name\}/)
  assert.match(page, /membershipCheckoutHref/)
  assert.match(page, /Most popular/)
})

// Regression: membership section width and copy
test("16. Membership section stays inside the configured maximum width", () => {
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.match(page, /id=["']memberships["']/)
  assert.match(page, /max-w-\[1200px\]/)
  assert.equal(MEMBERSHIP_SECTION_COPY.eyebrow, "Memberships")
  assert.equal(MEMBERSHIP_SECTION_COPY.title, "Elevate Memberships")
})

// Regression: tab model and URL state
test("17. Tab URL state and audience model remain valid", () => {
  assert.equal(MEMBERSHIP_AUDIENCES.length, 2)
  assert.deepEqual(
    MEMBERSHIP_AUDIENCES.map((a) => a.id),
    ["individuals", "nonprofit"]
  )
  assert.equal(MEMBERSHIP_TABS.length, 2)
  assert.equal(DEFAULT_MEMBERSHIP_AUDIENCE, "individuals")
  assert.equal(parseMembershipAudienceParam("nonprofit"), "nonprofit")
  assert.equal(audienceFromLocationSearch("?membership=nonprofit"), "nonprofit")
  assert.equal(isPanelVisible("nonprofit", "individuals"), false)
  assert.equal(
    buildMembershipAudienceUrl("/programs", "utm_source=x", "nonprofit"),
    "/programs?utm_source=x&membership=nonprofit#memberships"
  )
  assert.equal(nextAudienceOnKey("individuals", "ArrowRight"), "nonprofit")
  assert.equal(nextAudienceOnKey("nonprofit", "Home"), "individuals")
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(component, /popstate/)
  assert.match(component, /history\.pushState/)
})

// Regression: individual checkout and sponsored billing copy
test("18. Existing member CTA and sponsored billing remain unchanged", () => {
  for (const tier of ELEVATE_MEMBERSHIPS) {
    const href = buildCheckoutConsentUrl({
      type: "membership",
      planSlug: tier.slug,
      interval: "monthly",
    })
    assert.match(href, /\/checkout\/consent/)
  }
  const account = readSrc("app/(dashboard)/dashboard/account/page.tsx")
  assert.match(account, /Billing is managed by your nonprofit sponsor/)
  assert.equal(
    SPONSORED_BILLING_COPY.includes("Billing is managed by your nonprofit sponsor"),
    true
  )
  const platinum = ELEVATE_MEMBERSHIPS.find((tier) => tier.slug === "plan-3")
  assert.ok(platinum)
  assert.equal(platinum.features.includes(PLATINUM_PLACEHOLDER_COPY), false)
  assert.match(NONPROFIT_SUPPORTING_NOTE, /individual account/i)
})
