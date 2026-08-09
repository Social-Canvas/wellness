import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  RETREATS_PRIVATE_EVENTS,
  VIP_COACHING,
  VIP_COACHING_CTA_FEATURES,
  RETREATS_CTA_FEATURES,
} from "../../../lib/constants/elevate-brand.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

const EM_DASH = "\u2014"

const VIP_OLD_BULLETS = [
  "Advanced diagnostics",
  "Bi-weekly 1:1 coaching",
  "Personalized healing protocol",
  "VIP retreat access",
] as const

const RETREAT_OLD_BULLETS = [
  "Immersive breathwork retreats",
  "Sound healing experiences",
  "Private group events",
  "In-person nervous system reset",
] as const

test("VIP card keeps heading and simplified description", () => {
  const page = read("src/app/(public)/programs/page.tsx")

  assert.equal(VIP_COACHING.name, "VIP Coaching with Dr. Pattani")
  assert.equal(VIP_COACHING.eyebrow, "Premium 1:1")
  assert.equal(
    VIP_COACHING.description,
    "Personalized, high-touch support built around your goals, with private coaching and an individualized approach."
  )
  assert.match(page, /FeatureEnquiryCard/)
  assert.match(page, /VIP_COACHING\.name/)
  assert.match(page, /VIP_COACHING\.description/)
})

test("VIP card does not render the old four benefit bullets", () => {
  const page = read("src/app/(public)/programs/page.tsx")
  const card = read("src/components/marketing/feature-enquiry-card.tsx")

  assert.doesNotMatch(page, /VIP_COACHING_CTA_FEATURES/)
  assert.doesNotMatch(page, /features=\{/)
  assert.doesNotMatch(card, /features\.map/)
  for (const bullet of VIP_OLD_BULLETS) {
    assert.equal(page.includes(bullet), false, `VIP bullet still in page: ${bullet}`)
  }
  assert.deepEqual([...VIP_COACHING_CTA_FEATURES], [...VIP_OLD_BULLETS])
})

test("VIP card has supporting line and Apply for VIP at /vip without By enquiry", () => {
  assert.equal(VIP_COACHING.supportingText, "Personalized program")
  assert.equal(VIP_COACHING.ctaLabel, "Apply for VIP")
  assert.equal(VIP_COACHING.ctaHref, "/vip")
  assert.equal("priceLabel" in VIP_COACHING, false)

  const page = read("src/app/(public)/programs/page.tsx")
  const card = read("src/components/marketing/feature-enquiry-card.tsx")
  assert.match(page, /VIP_COACHING\.supportingText/)
  assert.match(page, /VIP_COACHING\.ctaHref/)
  assert.doesNotMatch(card, /By enquiry/)
  assert.doesNotMatch(page, /By enquiry/)
  assert.match(page, /BRAND_IMAGES\.founderCoachingTreePose/)
})

test("Retreats card keeps heading and simplified description", () => {
  const page = read("src/app/(public)/programs/page.tsx")

  assert.equal(RETREATS_PRIVATE_EVENTS.name, "Retreats & Private Events")
  assert.equal(RETREATS_PRIVATE_EVENTS.eyebrow, "Live & in person")
  assert.equal(
    RETREATS_PRIVATE_EVENTS.description,
    "Immersive in-person experiences combining breathwork, reflection, and restorative practices for individuals and private groups."
  )
  assert.match(page, /RETREATS_PRIVATE_EVENTS\.name/)
  assert.match(page, /variant="green"/)
})

test("Retreats card does not render the old four benefit bullets", () => {
  const page = read("src/app/(public)/programs/page.tsx")

  assert.doesNotMatch(page, /RETREATS_CTA_FEATURES/)
  for (const bullet of RETREAT_OLD_BULLETS) {
    assert.equal(
      page.includes(bullet),
      false,
      `Retreat bullet still in page: ${bullet}`
    )
  }
  assert.deepEqual([...RETREATS_CTA_FEATURES], [...RETREAT_OLD_BULLETS])
})

test("Retreat card uses Explore retreats at /retreats without By enquiry", () => {
  assert.equal(
    RETREATS_PRIVATE_EVENTS.supportingText,
    "Upcoming dates and private events"
  )
  assert.equal(RETREATS_PRIVATE_EVENTS.ctaLabel, "Explore retreats")
  assert.equal(RETREATS_PRIVATE_EVENTS.ctaHref, "/retreats")
  assert.equal("priceLabel" in RETREATS_PRIVATE_EVENTS, false)

  const page = read("src/app/(public)/programs/page.tsx")
  assert.match(page, /RETREATS_PRIVATE_EVENTS\.ctaHref/)
  assert.match(page, /BRAND_IMAGES\.retreatSpiritual/)
})

test("VIP and Retreat use vertical FeatureEnquiryCard layout side by side", () => {
  const page = read("src/app/(public)/programs/page.tsx")
  const card = read("src/components/marketing/feature-enquiry-card.tsx")

  assert.match(page, /grid grid-cols-1 gap-\[18px\] lg:grid-cols-2/)
  assert.match(page, /id="vip-package"/)
  assert.match(page, /id="retreats-private-events"/)
  assert.doesNotMatch(page, /layout="editorial"/)
  assert.doesNotMatch(page, /<CtaBand/)

  assert.match(card, /aspect-\[4\/3\]/)
  assert.match(card, /data-slot="feature-enquiry-card"/)
  assert.match(card, /mt-auto/)
  assert.match(card, /w-full max-w-none/)
  assert.doesNotMatch(card, /max-w-\[240px\]/)
  assert.doesNotMatch(card, /0\.45fr/)
})

test("FeatureEnquiryCard uses calmer heading and full-width CTA", () => {
  const card = read("src/components/marketing/feature-enquiry-card.tsx")

  assert.match(card, /text-\[clamp\(1\.25rem,1\.8vw,1\.5rem\)\]/)
  assert.doesNotMatch(card, /text-\[clamp\(1\.625rem/)
  assert.doesNotMatch(card, /status/)
  assert.match(card, /supportingText/)
  assert.match(card, /buttonVariants\(\{ variant: "default", size: "default" \}\)/)
  assert.match(card, /bg-white text-ink hover:bg-cream/)
  assert.match(card, /rounded-\[18px\]/)
  assert.match(card, /bg-ink/)
  assert.match(card, /bg-green-deep/)
})

test("VIP and Retreat customer-facing copy has no em dash", () => {
  const brand = read("src/lib/constants/elevate-brand.ts")
  const page = read("src/app/(public)/programs/page.tsx")
  const card = read("src/components/marketing/feature-enquiry-card.tsx")

  for (const [label, source] of [
    ["elevate-brand", brand],
    ["programs page", page],
    ["feature-enquiry-card", card],
  ] as const) {
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
    assert.equal(
      stripped.includes(EM_DASH),
      false,
      `em dash found in ${label}`
    )
  }

  assert.equal(VIP_COACHING.description.includes(EM_DASH), false)
  assert.equal(RETREATS_PRIVATE_EVENTS.description.includes(EM_DASH), false)
})

test("enquiry routes remain canonical /vip and /retreats", () => {
  assert.equal(VIP_COACHING.ctaHref, "/vip")
  assert.equal(RETREATS_PRIVATE_EVENTS.ctaHref, "/retreats")
})

test("images remain the existing brand assets", () => {
  const page = read("src/app/(public)/programs/page.tsx")
  assert.match(page, /founderCoachingTreePose/)
  assert.match(page, /retreatSpiritual/)
})
