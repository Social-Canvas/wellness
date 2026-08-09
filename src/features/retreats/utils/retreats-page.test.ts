import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { RETREATS_PRIVATE_EVENTS } from "../../../lib/constants/elevate-brand.ts"
import { RETREATS_PAGE } from "../constants/retreats-page.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

const EM_DASH = "\u2014"

test("1. /retreats route renders RetreatsLandingPage", () => {
  const page = read("src/app/(public)/retreats/page.tsx")
  assert.match(page, /RetreatsLandingPage/)
  assert.match(page, /canonical: "\/retreats"/)
  assert.doesNotMatch(page, /RetreatEnquiryPage/)
})

test("2. Bali appears as a past retreat", () => {
  const landing = read("src/features/retreats/components/RetreatsLandingPage.tsx")
  const constants = read("src/features/retreats/constants/retreats-page.ts")
  assert.match(constants, /title: "Bali"/)
  assert.match(constants, /label: "Past Retreat"/)
  assert.match(landing, /past\.items\.map/)
  assert.equal(
    RETREATS_PAGE.past.items.some((item) => item.title === "Bali"),
    true
  )
})

test("3. Sedona appears as a past retreat with neutral treatment when needed", () => {
  const sedona = RETREATS_PAGE.past.items.find((item) => item.title === "Sedona")
  assert.ok(sedona)
  assert.equal(sedona?.imageKey, null)
  assert.equal(sedona?.label, "Past Retreat")
  assert.match(
    read("src/features/retreats/components/RetreatsLandingPage.tsx"),
    /Elevate Health/
  )
})

test("4. Rishikesh appears as upcoming", () => {
  assert.equal(RETREATS_PAGE.upcoming.heading, "Rishikesh 2027")
  assert.equal(RETREATS_PAGE.upcoming.eyebrow, "Upcoming")
  assert.match(
    read("src/features/retreats/components/RetreatsLandingPage.tsx"),
    /id=\{upcoming\.id\}/
  )
})

test("5. March to April 2027 is displayed", () => {
  assert.equal(RETREATS_PAGE.upcoming.timing, "March to April 2027")
  assert.match(RETREATS_PAGE.upcoming.intro, /March to April 2027/)
})

test("6. No unconfirmed exact Rishikesh date is shown", () => {
  assert.doesNotMatch(RETREATS_PAGE.upcoming.timing, /\d{1,2}\s+\w+\s+2027/)
  assert.doesNotMatch(RETREATS_PAGE.upcoming.intro, /opens on|registration open/i)
  assert.doesNotMatch(
    JSON.stringify(RETREATS_PAGE),
    /\b(January|February|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+2027\b/
  )
})

test("7. No unconfirmed price is shown", () => {
  assert.doesNotMatch(JSON.stringify(RETREATS_PAGE), /\$\d/)
  assert.doesNotMatch(JSON.stringify(RETREATS_PAGE), /price|USD|GBP/i)
})

test("8. Ask for more information CTA exists", () => {
  assert.equal(RETREATS_PAGE.hero.secondaryCta.label, "Ask for more information")
  assert.equal(RETREATS_PAGE.upcoming.ctaLabel, "Ask for more information")
  assert.match(
    read("src/features/leads/utils/retreat-enquiry.ts"),
    /Ask for more information/
  )
})

test("9. Enquiry uses the existing safe lead backend", () => {
  const landing = read("src/features/retreats/components/RetreatsLandingPage.tsx")
  const form = read("src/features/leads/components/LeadEnquiryForm.tsx")
  const service = read("src/features/leads/services/leads.service.ts")
  assert.match(landing, /LeadEnquiryForm/)
  assert.match(landing, /variant="retreat"/)
  assert.match(form, /submitLeadAction/)
  assert.match(service, /\.from\("leads"\)/)
  assert.doesNotMatch(landing, /stripe|checkout/i)
})

test("10. Programs retreat card links to /retreats with Explore retreats", () => {
  assert.equal(RETREATS_PRIVATE_EVENTS.ctaLabel, "Explore retreats")
  assert.equal(RETREATS_PRIVATE_EVENTS.ctaHref, "/retreats")
  const page = read("src/app/(public)/programs/page.tsx")
  assert.match(page, /RETREATS_PRIVATE_EVENTS\.ctaHref/)
  assert.doesNotMatch(page, /By enquiry/)
})

test("11. No Stripe Checkout is created from the retreat page", () => {
  const page = read("src/app/(public)/retreats/page.tsx")
  const landing = read("src/features/retreats/components/RetreatsLandingPage.tsx")
  assert.doesNotMatch(page, /stripe|checkout/i)
  assert.doesNotMatch(landing, /stripe|Checkout|createCheckout/i)
})

test("12. Sitemap includes /retreats", () => {
  const sitemap = read("src/app/sitemap.ts")
  assert.match(sitemap, /"\/retreats"/)
})

test("13. Mobile page stacks past retreat cards in one column", () => {
  const landing = read("src/features/retreats/components/RetreatsLandingPage.tsx")
  assert.match(landing, /grid-cols-1 gap-\[18px\] min-\[768px\]:grid-cols-2/)
  assert.doesNotMatch(landing, /overflow-x-scroll/)
})

test("14. New customer-facing retreat copy contains no em dash", () => {
  const constants = read("src/features/retreats/constants/retreats-page.ts")
  const landing = read("src/features/retreats/components/RetreatsLandingPage.tsx")
  const enquiry = read("src/features/leads/utils/retreat-enquiry.ts")
  for (const [label, source] of [
    ["retreats-page constants", constants],
    ["RetreatsLandingPage", landing],
    ["retreat-enquiry", enquiry],
  ] as const) {
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
    assert.equal(stripped.includes(EM_DASH), false, `em dash in ${label}`)
  }
})

test("15. Existing VIP enquiry flow remains unchanged", () => {
  const vipPage = read("src/app/(public)/vip/page.tsx")
  const vipEnquiry = read("src/features/leads/components/VipEnquiryPage.tsx")
  assert.match(vipPage, /VipEnquiryPage/)
  assert.match(vipEnquiry, /EnquiryPageShell/)
  assert.match(vipEnquiry, /variant="vip"/)
})

test("16. Programs retreat card styling remains FeatureEnquiryCard vertical", () => {
  const page = read("src/app/(public)/programs/page.tsx")
  const card = read("src/components/marketing/feature-enquiry-card.tsx")
  assert.match(page, /FeatureEnquiryCard/)
  assert.match(page, /variant="green"/)
  assert.match(card, /aspect-\[4\/3\]/)
  assert.match(card, /text-\[clamp\(1\.25rem,1\.8vw,1\.5rem\)\]/)
  assert.match(card, /w-full max-w-none/)
})

test("nav and footer expose Retreats", () => {
  const site = read("src/lib/constants/public-site.ts")
  assert.match(site, /label: "Retreats", href: "\/retreats"/)
})
