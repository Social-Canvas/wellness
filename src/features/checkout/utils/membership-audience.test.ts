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
  NONPROFIT_INQUIRY_CTA,
  NONPROFIT_INQUIRY_HREF,
  NONPROFIT_MEMBERSHIP_BENEFITS,
  NONPROFIT_MISSION_BODY,
  NONPROFIT_MISSION_EYEBROW,
  NONPROFIT_MISSION_HEADING,
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
  const start = component.indexOf("function NonprofitPartnershipOverview")
  assert.ok(start >= 0, "NonprofitPartnershipOverview not found")
  return component.slice(start)
}

test("1. Public nonprofit panel has one Connect with us CTA", () => {
  assert.equal(NONPROFIT_INQUIRY_CTA, "Connect with us")
  assert.equal(NONPROFIT_INQUIRY_HREF, "/private-events?intent=nonprofit-partnership")
  const panel = nonprofitPanelSource()
  assert.match(panel, /NONPROFIT_INQUIRY_CTA/)
  assert.match(panel, /NONPROFIT_INQUIRY_HREF/)
  assert.equal((panel.match(/NONPROFIT_INQUIRY_CTA/g) ?? []).length, 1)
})

test("1b. Mission statement sits between intro and shared benefits", () => {
  const panel = nonprofitPanelSource()
  const missionIdx = panel.indexOf("nonprofit-mission-heading")
  const benefitsIdx = panel.indexOf("nonprofit-shared-benefits-heading")
  const ctaIdx = panel.indexOf("NONPROFIT_INQUIRY_CTA")
  assert.ok(missionIdx >= 0)
  assert.ok(benefitsIdx > missionIdx)
  assert.ok(ctaIdx > benefitsIdx)
  assert.match(panel, /NONPROFIT_MISSION_EYEBROW/)
  assert.match(panel, /NONPROFIT_MISSION_HEADING/)
  assert.match(panel, /NONPROFIT_MISSION_BODY/)
  assert.equal(NONPROFIT_MISSION_EYEBROW, "OUR BELIEF")
  assert.equal(
    NONPROFIT_MISSION_HEADING,
    "A world where healing belongs to everyone"
  )
  assert.match(NONPROFIT_MISSION_BODY, /Dr\. Deepa Pattani/)
  assert.match(panel, /max-w-3xl/)
  assert.doesNotMatch(panel, /cure|diagnos|treat|prescri/i)
})

test("2. Public size/pricing cards are absent", () => {
  const panel = nonprofitPanelSource()
  assert.doesNotMatch(panel, /NONPROFIT_SEAT_PLANS/)
  assert.doesNotMatch(panel, /Choose your organization size/)
  assert.doesNotMatch(panel, /\$497|\$997|\$1,997|\$3,000/)
  assert.equal(NONPROFIT_PUBLIC_PRICING_CONFIRMED, false)
  // Historical data retained internally
  assert.equal(NONPROFIT_SEAT_PLANS.length, 4)
  assert.equal(NONPROFIT_PLAN_CHOICE_HEADING, "Choose your organization size")
})

test("3. Shared partnership benefits render once", () => {
  const panel = nonprofitPanelSource()
  assert.equal(
    NONPROFIT_SHARED_BENEFITS_TITLE,
    "Included with a nonprofit partnership"
  )
  assert.match(panel, /NONPROFIT_MEMBERSHIP_BENEFITS\.map/)
  assert.ok(NONPROFIT_MEMBERSHIP_BENEFITS.includes("Platinum-equivalent membership privileges"))
  assert.ok(
    NONPROFIT_MEMBERSHIP_BENEFITS.includes(
      "Elevate course and recorded-session library"
    )
  )
})

test("4. Inquiry URL never includes plan query params", () => {
  assert.equal(buildNonprofitInquiryHref("small"), NONPROFIT_INQUIRY_HREF)
  assert.equal(buildNonprofitInquiryHref(null), NONPROFIT_INQUIRY_HREF)
  assert.doesNotMatch(NONPROFIT_INQUIRY_HREF, /plan=/)
})

test("5. Legacy plan query params still parse safely", () => {
  assert.equal(parseNonprofitPlanParam("small"), "small")
  assert.equal(parseNonprofitPlanParam("tiny"), null)
  assert.equal(parseNonprofitPlanParam("<script>"), null)
})

test("6. No nonprofit panel starts Stripe Checkout", () => {
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.doesNotMatch(
    component,
    /buildCheckoutConsentUrl|stripe\.checkout|\/checkout\/consent/
  )
})

test("7. Individual membership cards remain unchanged", () => {
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.name),
    ["Elevate Core", "Elevate Gold", "Elevate Platinum"]
  )
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.priceLabel),
    ["$47", "$99", "$149"]
  )
})

test("8. Audience tab model remains Individuals + Nonprofit", () => {
  assert.equal(MEMBERSHIP_AUDIENCES.length, 2)
  assert.equal(MEMBERSHIP_TABS.length, 2)
  assert.equal(DEFAULT_MEMBERSHIP_AUDIENCE, "individuals")
  assert.equal(parseMembershipAudienceParam("nonprofit"), "nonprofit")
  assert.equal(audienceFromLocationSearch("?membership=nonprofit"), "nonprofit")
  assert.equal(isPanelVisible("nonprofit", "individuals"), false)
  assert.equal(nextAudienceOnKey("individuals", "ArrowRight"), "nonprofit")
  assert.equal(
    buildMembershipAudienceUrl("/programs", "utm_source=x", "nonprofit"),
    "/programs?utm_source=x&membership=nonprofit#memberships"
  )
})

test("9. Sponsored billing copy and Platinum placeholder rules remain", () => {
  assert.match(SPONSORED_BILLING_COPY, /Billing is managed by your nonprofit sponsor/)
  const platinum = ELEVATE_MEMBERSHIPS.find((tier) => tier.slug === "plan-3")
  assert.ok(platinum)
  assert.equal(platinum.features.includes(PLATINUM_PLACEHOLDER_COPY), false)
  assert.match(NONPROFIT_SUPPORTING_NOTE, /access code/i)
  assert.equal(MEMBERSHIP_SECTION_COPY.nonprofit.heading, "Memberships for Nonprofit Organizations")
})

test("10. Individual checkout URLs remain intact", () => {
  for (const tier of ELEVATE_MEMBERSHIPS) {
    const href = buildCheckoutConsentUrl({
      type: "membership",
      planSlug: tier.slug,
      interval: "monthly",
    })
    assert.match(href, /\/checkout\/consent/)
  }
})
