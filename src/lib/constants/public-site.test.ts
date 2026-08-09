import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import {
  HOMEPAGE_NONPROFIT_SECTION,
  NONPROFIT_HOW_IT_WORKS_STEPS,
  NONPROFIT_INQUIRY_CTA,
  NONPROFIT_INQUIRY_HREF,
  NONPROFIT_LANDING_EYEBROW,
  NONPROFIT_LANDING_HREF,
  NONPROFIT_LEARN_MORE_CTA,
  NONPROFIT_MISSION_BODY,
  NONPROFIT_MISSION_HEADING,
  NONPROFIT_SEAT_PLANS,
  NONPROFIT_START_CONVERSATION_CTA,
} from "../../features/checkout/utils/membership-audience.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")
const srcRoot = join(root, "src")

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), "utf8")
}

const EM_DASH = "\u2014"
const EN_DASH = "\u2013"

const MARKETING_COPY_FILES = [
  "lib/constants/public-site.ts",
  "lib/constants/elevate-brand.ts",
  "features/checkout/utils/membership-audience.ts",
  "features/leads/utils/nonprofit-enquiry.ts",
  "app/(public)/page.tsx",
  "app/(public)/nonprofits/page.tsx",
  "app/(public)/programs/page.tsx",
  "components/layout/public-navbar.tsx",
  "components/layout/footer.tsx",
] as const

const EXPECTED_PUBLIC_NAV = [
  { label: "Home", href: "/" },
  { label: "Programs", href: "/programs" },
  { label: "For Nonprofits", href: "/nonprofits" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
] as const

test("1. Public navbar includes For Nonprofits", () => {
  const publicSite = readSrc("lib/constants/public-site.ts")
  for (const link of EXPECTED_PUBLIC_NAV) {
    assert.match(publicSite, new RegExp(`label: "${link.label}"`))
    assert.match(publicSite, new RegExp(`href: "${link.href}"`))
  }
  const navOrder = EXPECTED_PUBLIC_NAV.map((link) => link.label)
  let cursor = -1
  for (const label of navOrder) {
    const next = publicSite.indexOf(`label: "${label}"`, cursor + 1)
    assert.ok(next > cursor, `expected ${label} after previous nav item`)
    cursor = next
  }
  const navbar = readSrc("components/layout/public-navbar.tsx")
  assert.match(navbar, /PUBLIC_NAV_LINKS/)
  assert.match(navbar, /NavbarLinks/)
})

test("2. Mobile nav includes For Nonprofits", () => {
  const mobile = readSrc("components/layout/public-mobile-nav.tsx")
  const navbar = readSrc("components/layout/public-navbar.tsx")
  assert.match(navbar, /PublicMobileNav/)
  assert.match(navbar, /PUBLIC_NAV_LINKS/)
  assert.match(mobile, /data-public-mobile-nav/)
  assert.match(mobile, /Main mobile/)
  assert.match(readSrc("lib/constants/public-site.ts"), /For Nonprofits/)
})

test("3. /nonprofits page renders from dedicated route", () => {
  const page = readSrc("app/(public)/nonprofits/page.tsx")
  assert.match(page, /NonprofitsLandingPage/)
  assert.match(page, /NONPROFIT_MISSION_HEADING/)
  assert.match(page, /NONPROFIT_INQUIRY_HREF/)
  assert.equal(NONPROFIT_LANDING_HREF, "/nonprofits")
})

test("4. Mission heading is present", () => {
  assert.equal(
    NONPROFIT_MISSION_HEADING,
    "A world where healing belongs to everyone"
  )
  assert.equal(NONPROFIT_LANDING_EYEBROW, "NONPROFIT PARTNERSHIPS")
  assert.match(NONPROFIT_MISSION_BODY, /Dr\. Deepa Pattani/)
  assert.doesNotMatch(NONPROFIT_MISSION_BODY, new RegExp(EM_DASH))
})

test("5. Connect with us CTA is present on landing and programs panel", () => {
  assert.equal(NONPROFIT_INQUIRY_CTA, "Connect with us")
  const landing = readSrc("app/(public)/nonprofits/page.tsx")
  const panel = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(landing, /NONPROFIT_INQUIRY_CTA/)
  assert.match(panel, /NONPROFIT_INQUIRY_CTA/)
})

test("6. Enquiry CTA uses canonical nonprofit enquiry route", () => {
  assert.equal(
    NONPROFIT_INQUIRY_HREF,
    "/private-events?intent=nonprofit-partnership"
  )
  const landing = readSrc("app/(public)/nonprofits/page.tsx")
  assert.match(landing, /NONPROFIT_INQUIRY_HREF/)
  assert.match(landing, /NONPROFIT_START_CONVERSATION_CTA/)
  assert.equal(NONPROFIT_START_CONVERSATION_CTA, "Start a conversation")
  assert.equal(NONPROFIT_HOW_IT_WORKS_STEPS.length, 3)
})

test("7. Old nonprofit pricing cards do not reappear", () => {
  const landing = readSrc("app/(public)/nonprofits/page.tsx")
  const panel = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  for (const source of [landing, panel]) {
    assert.doesNotMatch(source, /NONPROFIT_SEAT_PLANS/)
    assert.doesNotMatch(source, /Choose your organization size/)
    assert.doesNotMatch(source, /\$497|\$997|\$1,997|\$3,000/)
  }
  assert.equal(NONPROFIT_SEAT_PLANS.length, 4)
})

test("8. Programs nonprofit panel remains with learn-more link", () => {
  const panel = readSrc(
    "features/checkout/components/membership-audience-tabs.tsx"
  )
  assert.match(panel, /membership-panel-nonprofit/)
  assert.match(panel, /NONPROFIT_LEARN_MORE_CTA/)
  assert.match(panel, /NONPROFIT_LANDING_HREF/)
  assert.equal(
    NONPROFIT_LEARN_MORE_CTA,
    "Learn more about nonprofit partnerships"
  )
})

test("9. Homepage nonprofit discovery CTA", () => {
  const home = readSrc("app/(public)/page.tsx")
  assert.match(home, /HOMEPAGE_NONPROFIT_SECTION/)
  assert.match(home, /NONPROFIT_EXPLORE_CTA/)
  assert.match(home, /NONPROFIT_LANDING_HREF/)
  assert.equal(HOMEPAGE_NONPROFIT_SECTION.eyebrow, "FOR NONPROFITS")
  const membershipIdx = home.indexOf('id="memberships"')
  const nonprofitIdx = home.indexOf('id="for-nonprofits"')
  const testimonialsIdx = home.indexOf("<VideoTestimonialsSection")
  assert.ok(membershipIdx >= 0)
  assert.ok(nonprofitIdx > membershipIdx)
  assert.ok(testimonialsIdx > nonprofitIdx)
})

test("10. Footer includes For Nonprofits once via public nav links", () => {
  const footer = readSrc("components/layout/footer.tsx")
  const publicSite = readSrc("lib/constants/public-site.ts")
  assert.match(footer, /PUBLIC_NAV_LINKS/)
  assert.equal(
    (publicSite.match(/label: "For Nonprofits"/g) ?? []).length,
    1
  )
})

test("11. Sitemap includes /nonprofits", () => {
  const sitemap = readSrc("app/sitemap.ts")
  assert.match(sitemap, /\/nonprofits/)
})

test("12. Public app-owned marketing copy has no em dash", () => {
  function stripComments(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
  }

  for (const relativePath of MARKETING_COPY_FILES) {
    const source = stripComments(readSrc(relativePath))
    assert.equal(
      source.includes(EM_DASH),
      false,
      `em dash found in ${relativePath}`
    )
  }

  assert.doesNotMatch(NONPROFIT_MISSION_BODY, new RegExp(EN_DASH))
  for (const plan of NONPROFIT_SEAT_PLANS) {
    assert.doesNotMatch(plan.seatRangeLabel, new RegExp(EN_DASH))
    assert.doesNotMatch(plan.priceLabel, new RegExp(EN_DASH))
  }
})

test("13. Legacy nonprofit organizations path redirects to /nonprofits", () => {
  const legacy = readSrc(
    "app/(public)/programs/nonprofit-organizations/page.tsx"
  )
  assert.match(legacy, /redirect/)
  assert.match(legacy, /NONPROFIT_LANDING_HREF/)
})

test("14. Contributor docs include em-dash copy guideline", () => {
  const rules = readFileSync(join(root, "PROJECT_RULES.md"), "utf8")
  const workflow = readFileSync(join(root, "DEVELOPMENT_WORKFLOW.md"), "utf8")
  assert.match(rules, /Avoid em dashes in customer-facing Elevate copy/)
  assert.match(workflow, /Avoid em dashes in customer-facing Elevate copy/)
})

test("15. Stripe entitlement and org-seat modules remain untouched by this feature surface", () => {
  const entitlement = readSrc("server/services/entitlement.service.ts")
  const membership = readSrc("server/services/membership.service.ts")
  const accessCodes = readSrc("features/organizations/utils/access-codes.ts")
  assert.match(entitlement, /canAccess/)
  assert.match(membership, /getEffectiveMembership/)
  assert.match(accessCodes, /nonprofitPartnershipBenefitLabels/)

  const landing = readSrc("app/(public)/nonprofits/page.tsx")
  assert.doesNotMatch(landing, /stripe|buildCheckoutConsentUrl/i)
})

test("marketing copy scan stays inside src and skips node_modules", () => {
  function walk(dir: string, files: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next") {
        continue
      }
      const full = join(dir, entry)
      const stats = statSync(full)
      if (stats.isDirectory()) {
        walk(full, files)
      } else if (
        MARKETING_COPY_FILES.some((relative) => full.endsWith(relative))
      ) {
        files.push(full)
      }
    }
    return files
  }

  const found = walk(srcRoot)
  assert.equal(found.length, MARKETING_COPY_FILES.length)
})
