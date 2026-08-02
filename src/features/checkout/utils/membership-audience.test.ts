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
  NONPROFIT_INQUIRY_HREF,
  NONPROFIT_MEMBERSHIP_BENEFITS,
  NONPROFIT_PUBLIC_PRICING_CONFIRMED,
  NONPROFIT_SEAT_PLANS,
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

// 1. Membership section stays inside the configured maximum width
test("1. Membership section stays inside the configured maximum width", () => {
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.match(page, /id=["']memberships["']/)
  assert.match(page, /max-w-\[1200px\]/)
  assert.match(page, /mx-auto w-full max-w-\[1200px\] px-4 sm:px-6 lg:px-8/)
  assert.match(page, /max-w-3xl/)
  assert.equal(MEMBERSHIP_SECTION_COPY.eyebrow, "Memberships")
  assert.equal(MEMBERSHIP_SECTION_COPY.title, "Elevate Memberships")
})

// 2. Anchor offset prevents sticky-navbar overlap
test("2. Anchor offset prevents sticky-navbar overlap", () => {
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.match(page, /id=["']memberships["'][\s\S]*?scroll-mt-32/)
  assert.doesNotMatch(
    page,
    /id=["']memberships["'][^>]*scroll-mt-24/
  )
})

// 3. No horizontal overflow at mobile and desktop widths
test("3. No horizontal overflow at mobile and desktop widths", () => {
  const page = readSrc("app/(public)/programs/page.tsx")
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(page, /overflow-x-hidden/)
  assert.match(page, /grid-cols-1/)
  assert.match(page, /md:grid-cols-2/)
  assert.match(page, /lg:grid-cols-3/)
  assert.match(page, /gap-6/)
  assert.match(component, /overflow-x-hidden/)
  assert.match(component, /grid-cols-1 gap-6 sm:grid-cols-2/)
  assert.match(component, /min-h-11/)
})

// 4. Individual cards retain $47, $99 and $149
test("4. Individual cards retain $47, $99 and $149", () => {
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
})

// 5. Nonprofit tab renders four pricing cards
test("5. Nonprofit tab renders four pricing cards", () => {
  assert.equal(NONPROFIT_PUBLIC_PRICING_CONFIRMED, true)
  assert.equal(NONPROFIT_SEAT_PLANS.length, 4)
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(component, /NONPROFIT_SEAT_PLANS\.map/)
  assert.match(component, /membership-panel-nonprofit/)
  assert.doesNotMatch(component, /NONPROFIT_INQUIRY_CTA/)
})

// 6. Small plan shows 1–25 and $497
test("6. Small plan shows 1–25 and $497", () => {
  const small = NONPROFIT_SEAT_PLANS.find((plan) => plan.slug === "small")
  assert.ok(small)
  assert.equal(small.name, "Small Organization")
  assert.equal(small.seatRangeLabel, "1–25 participants")
  assert.equal(small.priceLabel, "$497")
  assert.equal(small.ctaLabel, "Request this plan")
})

// 7. Mid-size plan shows 26–75 and $997
test("7. Mid-size plan shows 26–75 and $997", () => {
  const mid = NONPROFIT_SEAT_PLANS.find((plan) => plan.slug === "mid-size")
  assert.ok(mid)
  assert.equal(mid.name, "Mid-Size Organization")
  assert.equal(mid.seatRangeLabel, "26–75 participants")
  assert.equal(mid.priceLabel, "$997")
  assert.equal(mid.ctaLabel, "Request this plan")
})

// 8. Large plan shows 76–200 and $1,997
test("8. Large plan shows 76–200 and $1,997", () => {
  const large = NONPROFIT_SEAT_PLANS.find((plan) => plan.slug === "large")
  assert.ok(large)
  assert.equal(large.name, "Large Organization")
  assert.equal(large.seatRangeLabel, "76–200 participants")
  assert.equal(large.priceLabel, "$1,997")
  assert.equal(large.ctaLabel, "Request this plan")
})

// 9. Enterprise shows 201+ and $3,000–$5,000
test("9. Enterprise shows 201+ and $3,000–$5,000", () => {
  const enterprise = NONPROFIT_SEAT_PLANS.find(
    (plan) => plan.slug === "enterprise"
  )
  assert.ok(enterprise)
  assert.equal(enterprise.name, "Enterprise")
  assert.equal(enterprise.seatRangeLabel, "201+ participants")
  assert.equal(enterprise.priceLabel, "$3,000–$5,000")
  assert.equal(enterprise.ctaLabel, "Discuss enterprise access")
  assert.equal(enterprise.customPricing, true)
})

// 10. Nonprofit cards do not use Stripe Checkout
test("10. Nonprofit cards do not use Stripe Checkout", () => {
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(component, /buildNonprofitInquiryHref/)
  assert.doesNotMatch(component, /buildCheckoutConsentUrl|stripe\.checkout|\/checkout\/consent/)
  for (const plan of NONPROFIT_SEAT_PLANS) {
    const href = buildNonprofitInquiryHref(plan.slug)
    assert.match(href, /\/private-events/)
    assert.doesNotMatch(href, /\/checkout|consent/)
  }
  const audienceUtil = readSrc("features/checkout/utils/membership-audience.ts")
  assert.doesNotMatch(audienceUtil, /stripe\.|price_[A-Za-z0-9]/i)
})

// 11. Each nonprofit CTA passes an approved plan identifier
test("11. Each nonprofit CTA passes an approved plan identifier", () => {
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
})

// 12. Invalid plan identifiers are rejected or ignored safely
test("12. Invalid plan identifiers are rejected or ignored safely", () => {
  assert.equal(parseNonprofitPlanParam("small"), "small")
  assert.equal(parseNonprofitPlanParam("enterprise"), "enterprise")
  assert.equal(parseNonprofitPlanParam("orgs"), null)
  assert.equal(parseNonprofitPlanParam("mid"), null)
  assert.equal(parseNonprofitPlanParam(""), null)
  assert.equal(parseNonprofitPlanParam(undefined), null)
  assert.equal(parseNonprofitPlanParam(["bad", "small"]), null)
  const privateEvents = readSrc("app/(public)/private-events/page.tsx")
  assert.match(privateEvents, /parseNonprofitPlanParam/)
})

// 13. No separate Organizations category appears
test("13. No separate Organizations category appears", () => {
  assert.equal(MEMBERSHIP_AUDIENCES.length, 2)
  assert.deepEqual(
    MEMBERSHIP_AUDIENCES.map((a) => a.id),
    ["individuals", "nonprofit"]
  )
  assert.equal(
    MEMBERSHIP_AUDIENCES.some(
      (a) => a.id === "organizations" || a.label === "Organizations"
    ),
    false
  )
  assert.equal(MEMBERSHIP_TABS.length, 2)
  assert.equal(MEMBERSHIP_TABS[0]?.id, "individuals")
  assert.equal(MEMBERSHIP_TABS[1]?.label, "Nonprofit Organizations")
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.doesNotMatch(page, /label:\s*["']Organizations["']/)
})

// 14. The long implementation-style feature checklist is removed
test("14. The long implementation-style feature checklist is removed", () => {
  const joined = NONPROFIT_MEMBERSHIP_BENEFITS.join(" ")
  assert.doesNotMatch(
    joined,
    /active,\s*invited,\s*suspended|no shared organization login|assigned membership level|upgrade and downgrade/i
  )
  assert.match(joined, /Individual member accounts/i)
  assert.match(joined, /Elevate course library/i)
  assert.match(joined, /Weekly live reset/i)
  assert.match(joined, /administrator dashboard/i)
  assert.match(NONPROFIT_SUPPORTING_NOTE, /individual account/i)
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.doesNotMatch(
    component,
    /self-serve nonprofit Checkout|Member statuses: active/
  )
  assert.match(component, /NONPROFIT_SUPPORTING_NOTE/)
})

// 15. Additional Platinum privileges configurable is not rendered
test("15. Additional Platinum privileges configurable is not rendered", () => {
  const platinum = ELEVATE_MEMBERSHIPS.find((tier) => tier.slug === "plan-3")
  assert.ok(platinum)
  assert.equal(
    platinum.features.includes(PLATINUM_PLACEHOLDER_COPY),
    false
  )
  const brand = readSrc("lib/constants/elevate-brand.ts")
  assert.doesNotMatch(brand, /Additional Platinum privileges configurable/)
})

// 16. Tab URL state continues to work
test("16. Tab URL state continues to work", () => {
  assert.equal(DEFAULT_MEMBERSHIP_AUDIENCE, "individuals")
  assert.equal(parseMembershipAudienceParam("individuals"), "individuals")
  assert.equal(parseMembershipAudienceParam("nonprofit"), "nonprofit")
  assert.equal(audienceFromLocationSearch("?membership=nonprofit"), "nonprofit")
  assert.equal(parseMembershipAudienceParam("orgs"), "individuals")
  assert.equal(isPanelVisible("individuals", "individuals"), true)
  assert.equal(isPanelVisible("nonprofit", "individuals"), false)
})

// 17. Browser Back and Forward preserve tab selection
test("17. Browser Back and Forward preserve tab selection", () => {
  const withUtm = buildMembershipAudienceUrl(
    "/programs",
    "utm_source=newsletter&ref=nav",
    "nonprofit"
  )
  assert.equal(
    withUtm,
    "/programs?utm_source=newsletter&ref=nav&membership=nonprofit#memberships"
  )
  const switched = buildMembershipAudienceUrl(
    "/programs",
    "membership=nonprofit&utm_source=newsletter",
    "individuals"
  )
  assert.equal(
    switched,
    "/programs?membership=individuals&utm_source=newsletter#memberships"
  )
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(component, /popstate/)
  assert.match(component, /history\.pushState/)
})

// 18. Keyboard tab behavior remains accessible
test("18. Keyboard tab behavior remains accessible", () => {
  assert.equal(nextAudienceOnKey("individuals", "ArrowRight"), "nonprofit")
  assert.equal(nextAudienceOnKey("nonprofit", "ArrowLeft"), "individuals")
  assert.equal(nextAudienceOnKey("nonprofit", "ArrowRight"), "individuals")
  assert.equal(nextAudienceOnKey("individuals", "Home"), "individuals")
  assert.equal(nextAudienceOnKey("individuals", "End"), "nonprofit")
  assert.equal(nextAudienceOnKey("nonprofit", "Home"), "individuals")
  assert.equal(nextAudienceOnKey("individuals", "Enter"), null)
})

// 19. Existing member CTA behavior remains unchanged
test("19. Existing member CTA behavior remains unchanged", () => {
  for (const tier of ELEVATE_MEMBERSHIPS) {
    const href = buildCheckoutConsentUrl({
      type: "membership",
      planSlug: tier.slug,
      interval: "monthly",
    })
    assert.match(href, /\/checkout\/consent/)
    assert.match(href, new RegExp(`planSlug=${tier.slug}`))
    assert.match(href, /type=membership/)
  }
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.match(page, /Join \{tier\.name\}/)
  assert.match(page, /membershipCheckoutHref/)
  const account = readSrc("app/(dashboard)/dashboard/account/page.tsx")
  assert.match(account, /hasPersonalBilling/)
  assert.match(account, /isSponsored/)
  assert.match(account, /Billing is managed by your nonprofit sponsor/)
  assert.equal(
    SPONSORED_BILLING_COPY.includes("Billing is managed by your nonprofit sponsor"),
    true
  )
})

// 20. No database, Stripe, email or media configuration changes
test("20. No database, Stripe, email or media configuration changes in audience surface", () => {
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.slug),
    ["plan-1", "plan-2", "plan-3"]
  )
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.doesNotMatch(page, /stripe\.prices\.create|Price\.create/)
  assert.doesNotMatch(page, /price_[A-Za-z0-9]+/)
  const audienceUtil = readSrc("features/checkout/utils/membership-audience.ts")
  assert.doesNotMatch(audienceUtil, /stripe\.|price_[A-Za-z0-9]/i)
  assert.match(
    MEMBERSHIP_SECTION_COPY.subtitle,
    /Every active membership includes the Elevate course library/
  )
  const joined = NONPROFIT_MEMBERSHIP_BENEFITS.join(" ")
  assert.match(joined, /course library/i)
  assert.doesNotMatch(joined, /separate course library|nonprofit-only courses/i)
})
