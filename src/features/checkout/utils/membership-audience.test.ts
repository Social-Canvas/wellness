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
  NONPROFIT_PUBLIC_PRICING_CONFIRMED,
  PLATINUM_PLACEHOLDER_COPY,
  SPONSORED_BILLING_COPY,
  audienceFromLocationSearch,
  buildMembershipAudienceUrl,
  isPanelVisible,
  nextAudienceOnKey,
  parseMembershipAudienceParam,
} from "./membership-audience.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

// 1. Memberships eyebrow renders
test("1. Memberships eyebrow is MEMBERSHIPS (not FOR INDIVIDUALS)", () => {
  assert.equal(MEMBERSHIP_SECTION_COPY.eyebrow, "Memberships")
  assert.notEqual(MEMBERSHIP_SECTION_COPY.eyebrow.toLowerCase(), "for individuals")
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.match(page, /MEMBERSHIP_SECTION_COPY\.eyebrow/)
  assert.doesNotMatch(page, /eyebrow=["']For Individuals["']/)
})

// 2. Individuals tab is selected by default
test("2. Individuals tab is selected by default", () => {
  assert.equal(DEFAULT_MEMBERSHIP_AUDIENCE, "individuals")
  assert.equal(parseMembershipAudienceParam(undefined), "individuals")
  assert.equal(parseMembershipAudienceParam(null), "individuals")
  assert.equal(MEMBERSHIP_TABS[0]?.id, "individuals")
})

// 3. Nonprofit Organizations tab renders
test("3. Nonprofit Organizations tab is defined with panel wiring", () => {
  const nonprofit = MEMBERSHIP_TABS.find((tab) => tab.id === "nonprofit")
  assert.ok(nonprofit)
  assert.equal(nonprofit.label, "Nonprofit Organizations")
  assert.equal(nonprofit.panelId, "membership-panel-nonprofit")
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(component, /membership-panel-nonprofit/)
  assert.match(component, /MEMBERSHIP_TABS\.map/)
  assert.match(component, /\{tab\.label\}/)
})

// 4. Core, Gold and Platinum appear only in the Individuals panel
test("4. Core, Gold and Platinum plans belong to Individuals panel only", () => {
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.name),
    ["Elevate Core", "Elevate Gold", "Elevate Platinum"]
  )
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(component, /individualsPanel/)
  assert.doesNotMatch(
    component,
    /ELEVATE_MEMBERSHIPS|Elevate Core|plan-1/
  )
  assert.equal(isPanelVisible("individuals", "individuals"), true)
  assert.equal(isPanelVisible("nonprofit", "individuals"), false)
})

// 5. Individual prices remain $47, $99 and $149
test("5. Individual prices remain $47, $99 and $149", () => {
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.priceLabel),
    ["$47", "$99", "$149"]
  )
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.priceCents),
    [4700, 9900, 14900]
  )
})

// 6. Query parameter selects the correct panel
test("6. Query parameter selects the correct panel", () => {
  assert.equal(parseMembershipAudienceParam("individuals"), "individuals")
  assert.equal(parseMembershipAudienceParam("nonprofit"), "nonprofit")
  assert.equal(audienceFromLocationSearch("?membership=nonprofit"), "nonprofit")
  assert.equal(
    audienceFromLocationSearch("membership=individuals&utm=x"),
    "individuals"
  )
})

// 7. Invalid query parameter falls back safely
test("7. Invalid query parameter falls back to individuals", () => {
  assert.equal(parseMembershipAudienceParam("orgs"), "individuals")
  assert.equal(parseMembershipAudienceParam("organizations"), "individuals")
  assert.equal(parseMembershipAudienceParam(""), "individuals")
  assert.equal(parseMembershipAudienceParam(["bad", "nonprofit"]), "individuals")
  assert.equal(audienceFromLocationSearch("?membership=nope"), "individuals")
})

// 8. Browser navigation state works
test("8. Browser navigation URL builder preserves unrelated params and hash", () => {
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

// 9. Keyboard tab navigation works
test("9. Keyboard tab navigation supports Left, Right, Home and End", () => {
  assert.equal(nextAudienceOnKey("individuals", "ArrowRight"), "nonprofit")
  assert.equal(nextAudienceOnKey("nonprofit", "ArrowLeft"), "individuals")
  assert.equal(nextAudienceOnKey("nonprofit", "ArrowRight"), "individuals")
  assert.equal(nextAudienceOnKey("individuals", "Home"), "individuals")
  assert.equal(nextAudienceOnKey("individuals", "End"), "nonprofit")
  assert.equal(nextAudienceOnKey("nonprofit", "Home"), "individuals")
  assert.equal(nextAudienceOnKey("individuals", "Enter"), null)
})

// 10. Current member CTA behavior is preserved
test("10. Individual membership CTAs still route through checkout consent", () => {
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
})

// 11. Sponsored users do not receive personal billing controls
test("11. Sponsored users do not receive personal billing controls", () => {
  const account = readSrc("app/(dashboard)/dashboard/account/page.tsx")
  assert.match(account, /hasPersonalBilling/)
  assert.match(account, /isSponsored/)
  assert.match(account, /Billing is managed by your nonprofit sponsor/)
  assert.equal(
    SPONSORED_BILLING_COPY.includes("Billing is managed by your nonprofit sponsor"),
    true
  )
  assert.doesNotMatch(
    account,
    /hasPersonalBilling \? \(\s*<ManageBillingButton \/>\s*\) : membership\.isSponsored \? \(\s*<ManageBillingButton/
  )
})

// 12. Nonprofit copy describes individual accounts and seat management
test("12. Nonprofit copy describes individual accounts and seat management", () => {
  assert.match(
    MEMBERSHIP_SECTION_COPY.nonprofit.description,
    /individual Elevate accounts/i
  )
  const joined = NONPROFIT_MEMBERSHIP_BENEFITS.join(" ")
  assert.match(joined, /Individual member accounts/i)
  assert.match(joined, /Seat invitations/i)
  assert.match(joined, /no shared organization login/i)
  assert.match(joined, /administrator dashboard/i)
  assert.doesNotMatch(joined, /capability table|entitlement resolution/i)
})

// 13. No separate generic Organizations category appears
test("13. No separate generic Organizations category appears", () => {
  assert.equal(MEMBERSHIP_AUDIENCES.length, 2)
  assert.deepEqual(
    MEMBERSHIP_AUDIENCES.map((a) => a.id),
    ["individuals", "nonprofit"]
  )
  assert.equal(
    MEMBERSHIP_AUDIENCES.some((a) => a.id === "organizations" || a.label === "Organizations"),
    false
  )
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.doesNotMatch(page, /For Nonprofit Organizations/)
  assert.doesNotMatch(page, /label:\s*["']Organizations["']/)
})

// 14. No duplicated course offering appears
test("14. No duplicated course offering for nonprofit — shared library only", () => {
  const joined = NONPROFIT_MEMBERSHIP_BENEFITS.join(" ")
  assert.match(joined, /Shared Elevate course library/i)
  assert.match(joined, /same content as individual/i)
  assert.doesNotMatch(joined, /separate course library|nonprofit-only courses/i)
  assert.equal(
    ELEVATE_MEMBERSHIPS.every((tier) =>
      tier.features.some((f) => /course library/i.test(f) || /Everything in Elevate/i.test(f))
    ),
    true
  )
})

// 15. No unconfirmed nonprofit pricing is invented
test("15. No unconfirmed nonprofit pricing is invented in the audience tab", () => {
  assert.equal(NONPROFIT_PUBLIC_PRICING_CONFIRMED, false)
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.doesNotMatch(component, /\$497|\$997|\$1,997|\$19–\$29|\$199\/year/)
  assert.equal(NONPROFIT_INQUIRY_CTA, "Request nonprofit membership information")
  assert.equal(
    NONPROFIT_INQUIRY_HREF,
    "/private-events?intent=nonprofit-partnership"
  )
  assert.match(component, /\{NONPROFIT_INQUIRY_CTA\}/)
  assert.match(component, /href=\{NONPROFIT_INQUIRY_HREF\}/)
  assert.match(component, /self-serve nonprofit Checkout/)
})

// 16. No Additional Platinum privileges configurable placeholder
test("16. No Additional Platinum privileges configurable placeholder", () => {
  const platinum = ELEVATE_MEMBERSHIPS.find((tier) => tier.slug === "plan-3")
  assert.ok(platinum)
  assert.equal(
    platinum.features.includes(PLATINUM_PLACEHOLDER_COPY),
    false
  )
  const brand = readSrc("lib/constants/elevate-brand.ts")
  assert.doesNotMatch(brand, /Additional Platinum privileges configurable/)
})

// 17. Mobile layout does not overflow
test("17. Mobile layout uses stacking grids and overflow containment", () => {
  const page = readSrc("app/(public)/programs/page.tsx")
  const component = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(page, /grid-cols-1/)
  assert.match(page, /min-\[861px\]:grid-cols-3/)
  assert.match(page, /overflow-x-hidden/)
  assert.match(component, /overflow-x-hidden/)
  assert.match(component, /min-h-11/)
  assert.match(component, /flex-col.*sm:flex-row|w-full max-w-lg/)
})

// 18. Stripe and entitlement mappings remain unchanged
test("18. Stripe and entitlement mappings remain unchanged", () => {
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.slug),
    ["plan-1", "plan-2", "plan-3"]
  )
  const page = readSrc("app/(public)/programs/page.tsx")
  assert.doesNotMatch(page, /stripe\.prices\.create|Price\.create/)
  assert.doesNotMatch(page, /price_[A-Za-z0-9]+/)
  const audienceUtil = readSrc("features/checkout/utils/membership-audience.ts")
  assert.doesNotMatch(audienceUtil, /stripe|price_/i)
  const href = buildCheckoutConsentUrl({
    type: "membership",
    planSlug: "plan-2",
    interval: "monthly",
  })
  assert.equal(href.includes("planSlug=plan-2"), true)
})

test("section introduction copy matches product requirements", () => {
  assert.equal(MEMBERSHIP_SECTION_COPY.title, "Elevate Memberships")
  assert.match(
    MEMBERSHIP_SECTION_COPY.subtitle,
    /Every active membership includes the Elevate course library/
  )
})
