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

const PUBLIC_RETREAT_SOURCES = [
  "src/features/retreats/constants/retreats-page.ts",
  "src/features/retreats/components/RetreatsLandingPage.tsx",
  "src/features/leads/utils/retreat-enquiry.ts",
  "src/app/(public)/retreats/page.tsx",
] as const

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
}

test("1. Retreats page renders", () => {
  const page = read("src/app/(public)/retreats/page.tsx")
  assert.match(page, /RetreatsLandingPage/)
  assert.match(page, /canonical: "\/retreats"/)
  assert.doesNotMatch(page, /RetreatEnquiryPage/)
  assert.equal(RETREATS_PAGE.metaTitle, "Retreats")
})

test("2. Sedona appears as a past retreat", () => {
  const sedona = RETREATS_PAGE.past.items.find((item) => item.title === "Sedona")
  assert.ok(sedona)
  assert.equal(sedona?.label, "Past Retreat")
  assert.equal(sedona?.imageKey, "sedonaRetreatLandscape")
})

test("3. Sedona has no public date or logistics", () => {
  const sedona = RETREATS_PAGE.past.items.find((item) => item.title === "Sedona")
  assert.ok(sedona)
  assert.equal("date" in sedona, false)
  assert.equal("location" in sedona, false)
  assert.equal("inclusions" in sedona, false)
  assert.doesNotMatch(sedona?.description ?? "", /May 1|2025|PHX|shuttle|\$\d/i)
})

test("4. Bali appears as a past retreat", () => {
  const bali = RETREATS_PAGE.past.items.find((item) => item.title === "Bali")
  assert.ok(bali)
  assert.equal(bali?.label, "Past Retreat")
  assert.equal(bali?.imageKey, "founderTempleMeditation")
})

test("5. No invented Bali details are rendered", () => {
  const bali = RETREATS_PAGE.past.items.find((item) => item.title === "Bali")
  assert.ok(bali)
  assert.doesNotMatch(bali?.description ?? "", /\b20\d{2}\b/)
  assert.doesNotMatch(bali?.description ?? "", /\$\d|venue|itinerary/i)
  assert.equal("date" in bali, false)
})

test("6. What to Expect section is present", () => {
  assert.equal(
    RETREATS_PAGE.expect.heading,
    "What to expect from an Elevate retreat"
  )
  assert.equal(RETREATS_PAGE.expect.items.length, 6)
  assert.match(
    read("src/features/retreats/components/RetreatsLandingPage.tsx"),
    /expect\.items\.map/
  )
})

test("7. Old Sedona prices and payment instructions are not public", () => {
  const corpus = PUBLIC_RETREAT_SOURCES.map((path) =>
    stripComments(read(path))
  ).join("\n")
  assert.doesNotMatch(corpus, /\$\s*3,?500/)
  assert.doesNotMatch(corpus, /\$\s*2,?750/)
  assert.doesNotMatch(corpus, /\$\s*2,?500/)
  assert.doesNotMatch(corpus, /Zelle/i)
  assert.doesNotMatch(corpus, /payment plan/i)
  assert.doesNotMatch(corpus, /Reserve yours now/i)
  assert.doesNotMatch(corpus, /Spots extremely limited/i)
  assert.doesNotMatch(corpus, /archive flyer/i)
})

test("8. Rishikesh appears as upcoming", () => {
  assert.equal(RETREATS_PAGE.upcoming.heading, "Rishikesh 2027")
  assert.equal(RETREATS_PAGE.upcoming.eyebrow, "UPCOMING")
})

test("9. March to April 2027 is displayed", () => {
  assert.equal(RETREATS_PAGE.upcoming.timing, "March to April 2027")
})

test("10. No exact Rishikesh date, price, or booking CTA", () => {
  assert.doesNotMatch(RETREATS_PAGE.upcoming.timing, /\d{1,2}\s+\w+\s+2027/)
  assert.doesNotMatch(JSON.stringify(RETREATS_PAGE.upcoming), /\$\d/)
  assert.doesNotMatch(
    JSON.stringify(RETREATS_PAGE.upcoming),
    /Book now|Reserve now|registration open|countdown/i
  )
  assert.doesNotMatch(
    read("src/features/retreats/components/RetreatsLandingPage.tsx"),
    /application\/ld\+json/
  )
})

test("11. Ask for more information works", () => {
  assert.equal(RETREATS_PAGE.hero.secondaryCta.label, "Ask for more information")
  assert.equal(RETREATS_PAGE.upcoming.ctaLabel, "Ask for more information")
  assert.equal(RETREATS_PAGE.enquiry.heading, "Interested in an upcoming retreat?")
  assert.match(
    read("src/features/retreats/components/RetreatsLandingPage.tsx"),
    /LeadEnquiryForm/
  )
  assert.match(
    read("src/features/retreats/components/RetreatsLandingPage.tsx"),
    /variant="retreat"/
  )
})

test("12. No Stripe Checkout is created", () => {
  const page = read("src/app/(public)/retreats/page.tsx")
  const landing = read("src/features/retreats/components/RetreatsLandingPage.tsx")
  assert.doesNotMatch(page, /stripe|checkout/i)
  assert.doesNotMatch(landing, /stripe|Checkout|createCheckout/i)
})

test("13. Homepage Retreat CTA links to /retreats", () => {
  assert.equal(RETREATS_PRIVATE_EVENTS.ctaLabel, "Explore retreats")
  assert.equal(RETREATS_PRIVATE_EVENTS.ctaHref, "/retreats")
  assert.equal(RETREATS_PAGE.hero.primaryCta.label, "Explore retreats")
  const page = read("src/app/(public)/programs/page.tsx")
  assert.match(page, /RETREATS_PRIVATE_EVENTS\.ctaHref/)
})

test("14. No em dash exists in new retreat copy", () => {
  for (const path of PUBLIC_RETREAT_SOURCES) {
    assert.equal(
      stripComments(read(path)).includes(EM_DASH),
      false,
      `em dash in ${path}`
    )
  }
})

test("15. Mobile page stacks without horizontal overflow", () => {
  const landing = read("src/features/retreats/components/RetreatsLandingPage.tsx")
  assert.match(landing, /grid-cols-1 gap-\[18px\] min-\[768px\]:grid-cols-2/)
  assert.match(landing, /min-w-0/)
  assert.doesNotMatch(landing, /overflow-x-scroll|w-screen/)
})

test("16. Existing VIP enquiry behavior remains unchanged", () => {
  const vipPage = read("src/app/(public)/vip/page.tsx")
  const vipEnquiry = read("src/features/leads/components/VipEnquiryPage.tsx")
  assert.match(vipPage, /VipEnquiryPage/)
  assert.match(vipEnquiry, /EnquiryPageShell/)
  assert.match(vipEnquiry, /variant="vip"/)
})

test("17. Page structure is hero, Rishikesh, expect, past, enquiry only", () => {
  const landing = read("src/features/retreats/components/RetreatsLandingPage.tsx")
  const upcomingAt = landing.indexOf("id={upcoming.id}")
  const expectAt = landing.indexOf("id={expect.id}")
  const pastAt = landing.indexOf("id={past.id}")
  const enquiryAt = landing.indexOf("id={enquiry.id}")
  assert.ok(upcomingAt > 0)
  assert.ok(expectAt > upcomingAt)
  assert.ok(pastAt > expectAt)
  assert.ok(enquiryAt > pastAt)
  assert.equal(RETREATS_PAGE.hero.primaryCta.href, "#rishikesh-2027")
  assert.doesNotMatch(landing, /finalCta|archiveLabel|experienceGroups|inclusions/)
  assert.equal("finalCta" in RETREATS_PAGE, false)
  assert.equal("sedona" in RETREATS_PAGE, false)
})

test("Programs retreat card styling remains FeatureEnquiryCard vertical", () => {
  const page = read("src/app/(public)/programs/page.tsx")
  const card = read("src/components/marketing/feature-enquiry-card.tsx")
  assert.match(page, /FeatureEnquiryCard/)
  assert.match(page, /variant="green"/)
  assert.match(card, /aspect-\[4\/3\]/)
  assert.match(card, /w-full max-w-none/)
})

test("Sitemap includes /retreats", () => {
  assert.match(read("src/app/sitemap.ts"), /"\/retreats"/)
})

test("nav and footer expose Retreats", () => {
  assert.match(
    read("src/lib/constants/public-site.ts"),
    /label: "Retreats", href: "\/retreats"/
  )
})

test("Enquiry uses the existing safe lead backend", () => {
  const form = read("src/features/leads/components/LeadEnquiryForm.tsx")
  const service = read("src/features/leads/services/leads.service.ts")
  assert.match(form, /submitLeadAction/)
  assert.match(service, /\.from\("leads"\)/)
})
