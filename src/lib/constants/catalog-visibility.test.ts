import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, test } from "node:test"
import { fileURLToPath } from "node:url"

import { ELEVATE_PROGRAM_OFFERS } from "./elevate-brand.ts"
import {
  HEALTH_PROFESSIONAL_SESSION_SLUG,
  PUBLICLY_HIDDEN_CATALOG_SLUGS,
  canAdminPreviewHiddenCatalog,
  getPublicProgramOffers,
  isPublicCatalogProduct,
  isPubliclyHiddenCatalogSlug,
  isUnauthorizedPublicCatalogAccess,
} from "./catalog-visibility.ts"
import {
  LIVE_STRIPE_ACTIVATION_INVENTORY,
  formatLiveStripeActivationReport,
  isLiveStripeCheckoutEligible,
} from "../../server/integrations/stripe/live-activation-inventory.ts"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..")

function readRepo(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8")
}

describe("Health Professional Session public hide", () => {
  test("slug is marked publicly hidden", () => {
    assert.equal(
      isPubliclyHiddenCatalogSlug(HEALTH_PROFESSIONAL_SESSION_SLUG),
      true
    )
    assert.deepEqual([...PUBLICLY_HIDDEN_CATALOG_SLUGS], [
      HEALTH_PROFESSIONAL_SESSION_SLUG,
    ])
  })

  test("absent from public program listings", () => {
    const publicOffers = getPublicProgramOffers(ELEVATE_PROGRAM_OFFERS)
    assert.equal(
      publicOffers.some((offer) => offer.slug === HEALTH_PROFESSIONAL_SESSION_SLUG),
      false
    )
    assert.equal(
      publicOffers.some((offer) => offer.title === "Health Professional Session"),
      false
    )
    assert.equal(
      publicOffers.some((offer) => offer.ctaLabel === "Book session"),
      false
    )

    // Source record retained for admin / re-enable.
    assert.equal(
      ELEVATE_PROGRAM_OFFERS.some(
        (offer) => offer.slug === HEALTH_PROFESSIONAL_SESSION_SLUG
      ),
      true
    )

    const programsPage = readRepo("src/app/(public)/programs/page.tsx")
    assert.match(programsPage, /getPublicProgramOffers/)
    assert.doesNotMatch(
      programsPage,
      /PROGRAM_OFFERS_WITHOUT_RESET\s*=\s*ELEVATE_PROGRAM_OFFERS\.filter/
    )

    const offer = ELEVATE_PROGRAM_OFFERS.find(
      (entry) => entry.slug === HEALTH_PROFESSIONAL_SESSION_SLUG
    )
    assert.ok(offer)
    assert.equal(offer.publiclyVisible, false)
  })

  test("excluded from live Stripe mapping", () => {
    assert.equal(isLiveStripeCheckoutEligible(HEALTH_PROFESSIONAL_SESSION_SLUG), false)
    assert.equal(
      formatLiveStripeActivationReport(HEALTH_PROFESSIONAL_SESSION_SLUG),
      "Health Professional Session — hidden — no live Checkout — no live Price"
    )

    const hidden = LIVE_STRIPE_ACTIVATION_INVENTORY.find(
      (item) => item.slug === HEALTH_PROFESSIONAL_SESSION_SLUG
    )
    assert.ok(hidden)
    assert.equal(hidden.status, "hidden")
    assert.equal(hidden.liveCheckout, false)
    assert.equal(hidden.livePrice, false)

    assert.equal(isLiveStripeCheckoutEligible("plan-1"), true)
    assert.equal(isLiveStripeCheckoutEligible("7-day-reset"), true)
    assert.equal(isLiveStripeCheckoutEligible("ebook-1"), true)
  })

  test("unauthorized direct access is denied", () => {
    assert.equal(
      isUnauthorizedPublicCatalogAccess({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        productStatus: "draft",
      }),
      true
    )
    assert.equal(
      isUnauthorizedPublicCatalogAccess({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        productStatus: "draft",
        previewRequested: true,
      }),
      true
    )
    assert.equal(
      isUnauthorizedPublicCatalogAccess({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        productStatus: "published",
      }),
      true
    )
    assert.equal(
      isPublicCatalogProduct({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        status: "draft",
      }),
      false
    )
    assert.equal(
      isPublicCatalogProduct({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        status: "published",
      }),
      false
    )
  })

  test("admin preview remains authorized without query-param alone", () => {
    assert.equal(
      canAdminPreviewHiddenCatalog({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        role: "admin",
      }),
      true
    )
    assert.equal(
      canAdminPreviewHiddenCatalog({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        role: "super_admin",
      }),
      true
    )
    assert.equal(
      canAdminPreviewHiddenCatalog({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        role: "user",
      }),
      false
    )
    // Public route stays denied even for admins; preview flag never unlocks it.
    assert.equal(
      isUnauthorizedPublicCatalogAccess({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        productStatus: "draft",
        previewRequested: true,
      }),
      true
    )
    assert.equal(
      isUnauthorizedPublicCatalogAccess({
        slug: HEALTH_PROFESSIONAL_SESSION_SLUG,
        productStatus: "draft",
      }),
      true
    )
  })

  test("existing records and media mappings are preserved", () => {
    const seed = readRepo("supabase/seed.sql")
    assert.match(seed, /'health-professional-session'/)
    assert.match(seed, /'Health Professional Session'/)
    assert.match(seed, /price_placeholder_health_professional_session/)
    // Product insert uses draft; course stays published for entitled access.
    assert.match(
      seed,
      /'health-professional-session',\s*'Health Professional Session',\s*'A two-hour recorded session for health professionals.',\s*'session',\s*'paid',\s*6500,\s*'usd',\s*'price_placeholder_health_professional_session',\s*'draft'/
    )

    const migration = readRepo(
      "supabase/migrations/20260803140000_hide_health_professional_session.sql"
    )
    assert.match(migration, /health-professional-session/)
    assert.match(migration, /status = 'draft'/)
    assert.doesNotMatch(migration, /delete from/i)
    assert.doesNotMatch(migration, /stripe_price_id\s*=\s*null/i)

    const images = readRepo("src/lib/brand/images.ts")
    assert.match(images, /"health-professional-session"/)

    const brand = readRepo("src/lib/constants/elevate-brand.ts")
    assert.match(brand, /Health Professional Session/)
    assert.match(brand, /publiclyVisible:\s*false/)
  })

  test("other programs remain in public offer set when reset is included", () => {
    const publicOffers = getPublicProgramOffers(ELEVATE_PROGRAM_OFFERS)
    assert.deepEqual(
      publicOffers.map((offer) => offer.slug),
      ["7-day-reset", "autoimmune-masterclass", "standalone-live-session"]
    )

    assert.equal(
      isPublicCatalogProduct({ slug: "7-day-reset", status: "published" }),
      true
    )
    assert.equal(
      isPublicCatalogProduct({ slug: "ebook-1", status: "published" }),
      true
    )
    assert.equal(
      isPublicCatalogProduct({
        slug: "autoimmune-masterclass",
        status: "published",
      }),
      true
    )
  })
})
