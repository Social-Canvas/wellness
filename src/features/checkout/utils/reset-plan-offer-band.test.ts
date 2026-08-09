import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  RESET_LIBRARY_PATH,
  RESET_PRODUCT_SLUG,
} from "../constants/destinations.ts"
import {
  RESET_PLAN_COURSE_HREF,
  buildResetPlanOfferView,
  progressAwareResetPlanCtaLabel,
} from "./reset-plan-offer-state.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

const EM_DASH = "\u2014"

const OLD_BULLETS = [
  "7-day nervous system reset",
  "Guided breathwork foundations",
  "Tools to exit survival mode",
  "Your gateway into Elevate",
] as const

const NEW_DESCRIPTION =
  "A focused 7-day experience with guided breathwork and practical tools to help you reset, reconnect, and build a calmer foundation."

test("Reset Plan card keeps heading and simplified description", () => {
  const brand = read("src/lib/constants/elevate-brand.ts")
  const band = read(
    "src/features/checkout/components/reset-plan-offer-band.tsx"
  )

  assert.match(brand, /name:\s*"Reset Plan"/)
  assert.match(brand, new RegExp(NEW_DESCRIPTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(band, /RESET_PLAN\.name/)
  assert.match(band, /RESET_PLAN\.description/)
  assert.match(band, /layout="editorial"/)
})

test("Reset Plan card does not render the old four benefit bullets", () => {
  const band = read(
    "src/features/checkout/components/reset-plan-offer-band.tsx"
  )

  assert.doesNotMatch(band, /RESET_PLAN_CTA_FEATURES/)
  assert.doesNotMatch(band, /features=\{/)
  for (const bullet of OLD_BULLETS) {
    assert.equal(band.includes(bullet), false, `bullet still in band: ${bullet}`)
  }
})

test("editorial CtaBand hides feature lists and stacks action under status", () => {
  const cta = read("src/components/marketing/cta-band.tsx")

  assert.match(cta, /layout\?\: "default" \| "editorial"/)
  assert.match(cta, /isEditorial/)
  // Compact single stack — no mt-auto forcing price/CTA to card bottom.
  assert.doesNotMatch(cta, /mt-auto/)
  assert.match(cta, /max-w-\[440px\]/)
  assert.match(cta, /max-w-\[300px\]/)
  assert.match(cta, /text-5xl/)
  assert.match(cta, /text-\[2\.5rem\]/)
  assert.match(cta, /justify-center/)
  assert.match(cta, /order-1/)
  assert.match(cta, /order-2/)
  assert.match(cta, /0\.45fr/)
  assert.match(cta, /0\.55fr/)
  // Default layout still renders features; editorial path does not map them.
  assert.match(cta, /features\.length > 0/)
  assert.match(cta, /editorialStatusBlock/)
})

test("owner Access active uses Continue Reset Plan and canonical course href", () => {
  const view = buildResetPlanOfferView({
    isAuthenticated: true,
    hasCourseAccess: true,
    accessSource: "complimentary",
    isFulfillmentPending: false,
    progress: "in_progress",
    checkoutHref: `/checkout/consent?type=product&slug=${RESET_PRODUCT_SLUG}`,
    courseHref: RESET_LIBRARY_PATH,
  })

  assert.equal(view.price, "Access active")
  assert.equal(view.ctaLabel, "Continue Reset Plan")
  assert.equal(view.ctaHref, RESET_PLAN_COURSE_HREF)
  assert.equal(view.ctaHref, RESET_LIBRARY_PATH)
  assert.equal(view.allowsCheckout, false)
  assert.equal(view.showPrice, false)
})

test("non-owner does not show Access active", () => {
  const loggedOut = buildResetPlanOfferView({
    isAuthenticated: false,
    hasCourseAccess: false,
    accessSource: "none",
    isFulfillmentPending: false,
    progress: "none",
    checkoutHref: `/checkout/consent?type=product&slug=${RESET_PRODUCT_SLUG}`,
  })

  assert.notEqual(loggedOut.price, "Access active")
  assert.equal(loggedOut.showPrice, true)
  assert.equal(loggedOut.ctaLabel, "Start Reset Plan")
  assert.match(loggedOut.ctaHref, /checkout\/consent/)
  assert.match(loggedOut.ctaHref, new RegExp(RESET_PRODUCT_SLUG))
})

test("completed progress keeps Review Reset Plan CTA from existing model", () => {
  assert.equal(progressAwareResetPlanCtaLabel("complete"), "Review Reset Plan")

  const view = buildResetPlanOfferView({
    isAuthenticated: true,
    hasCourseAccess: true,
    accessSource: "purchase",
    isFulfillmentPending: false,
    progress: "complete",
    checkoutHref: `/checkout/consent?type=product&slug=${RESET_PRODUCT_SLUG}`,
    courseHref: RESET_LIBRARY_PATH,
  })

  assert.equal(view.ctaLabel, "Review Reset Plan")
  assert.equal(view.ctaHref, RESET_LIBRARY_PATH)
})

test("Reset Plan offer band wires access statusVariant from showPrice", () => {
  const band = read(
    "src/features/checkout/components/reset-plan-offer-band.tsx"
  )

  assert.match(
    band,
    /statusVariant=\{offer\.showPrice \? "price" : "access"\}/
  )
  assert.match(band, /resolveCurrentResetPlanOffer/)
})

test("Reset Plan customer-facing component copy has no em dash", () => {
  const band = read(
    "src/features/checkout/components/reset-plan-offer-band.tsx"
  )
  const brand = read("src/lib/constants/elevate-brand.ts")
  const cta = read("src/components/marketing/cta-band.tsx")

  for (const [label, source] of [
    ["reset-plan-offer-band", band],
    ["elevate-brand RESET_PLAN block", brand],
    ["cta-band", cta],
  ] as const) {
    // Strip block and line comments before checking customer-facing strings.
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
    assert.equal(
      stripped.includes(EM_DASH),
      false,
      `em dash found in ${label}`
    )
  }

  assert.equal(NEW_DESCRIPTION.includes(EM_DASH), false)
})

test("mobile editorial stack places image before copy", () => {
  const cta = read("src/components/marketing/cta-band.tsx")

  // Image uses order-1; content panel uses order-2 on small screens.
  assert.match(
    cta,
    /order-2[\s\S]*min-\[861px\]:order-1[\s\S]*order-1[\s\S]*min-\[861px\]:order-2/
  )
})
