import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  AUTOIMMUNE_COURSE_ID,
  AUTOIMMUNE_LIBRARY_PATH,
  AUTOIMMUNE_PRICE_AMOUNT_CENTS,
  AUTOIMMUNE_PRODUCT_SLUG,
  isAutoimmunePurchase,
  resolvePostPurchaseDestination,
} from "../constants/destinations.ts"
import { createProductCheckoutSchema } from "../../shop/schemas/checkout.ts"
import { checkoutConsentSchema } from "../schemas/consent.ts"
import {
  isConfiguredStripePriceId,
  isStripeLiveSecretKey,
  isStripeTestSecretKey,
} from "../../../server/integrations/stripe/mode.ts"
import {
  formatLiveStripeActivationReport,
  isLiveStripeCheckoutEligible,
} from "../../../server/integrations/stripe/live-activation-inventory.ts"
import { resolveDownloadSourceLabel } from "../../shop/utils/free-claim.ts"
import {
  successPageGrantsEntitlement,
} from "../utils/checkout-success-state.ts"

test("Autoimmune product uses canonical slug and $47 one-time amount", () => {
  assert.equal(AUTOIMMUNE_PRODUCT_SLUG, "autoimmune-masterclass")
  assert.equal(AUTOIMMUNE_PRICE_AMOUNT_CENTS, 4700)
  assert.equal(AUTOIMMUNE_COURSE_ID.length, 36)
  assert.equal(AUTOIMMUNE_LIBRARY_PATH, `/dashboard/library/${AUTOIMMUNE_COURSE_ID}`)
})

test("Autoimmune purchase maps to course library destination", () => {
  assert.equal(
    isAutoimmunePurchase({ productSlug: AUTOIMMUNE_PRODUCT_SLUG }),
    true
  )
  assert.equal(
    isAutoimmunePurchase({ grantedCourseId: AUTOIMMUNE_COURSE_ID }),
    true
  )
  assert.equal(isAutoimmunePurchase({ productSlug: "ebook-1" }), false)

  const destination = resolvePostPurchaseDestination({
    purchaseType: "product",
    productSlug: AUTOIMMUNE_PRODUCT_SLUG,
    grantedCourseId: AUTOIMMUNE_COURSE_ID,
  })

  assert.equal(destination.href, AUTOIMMUNE_LIBRARY_PATH)
  assert.equal(destination.autoRedirect, true)
  assert.match(destination.label, /Autoimmune/i)
})

test("browser checkout schema accepts only product UUID — not price or amount", () => {
  const ok = createProductCheckoutSchema.safeParse({
    productId: "1f21d763-0000-4000-8000-0000000067b9",
  })
  assert.equal(ok.success, true)

  const withPrice = createProductCheckoutSchema.safeParse({
    productId: "1f21d763-0000-4000-8000-0000000067b9",
    stripePriceId: "price_fake",
    amount: 4700,
  })
  assert.equal(withPrice.success, true)
  assert.equal(
    "stripePriceId" in (withPrice.data as Record<string, unknown>),
    false
  )
  assert.equal("amount" in (withPrice.data as Record<string, unknown>), false)

  assert.equal(
    createProductCheckoutSchema.safeParse({ productId: "not-a-uuid" }).success,
    false
  )
})

test("placeholder Autoimmune price is not checkout-ready", () => {
  assert.equal(
    isConfiguredStripePriceId("price_placeholder_autoimmune_masterclass"),
    false
  )
  assert.equal(isConfiguredStripePriceId("price_1UabcdefghijklmnuDI6"), true)
})

test("Autoimmune is live Stripe checkout eligible", () => {
  assert.equal(isLiveStripeCheckoutEligible(AUTOIMMUNE_PRODUCT_SLUG), true)
  assert.match(
    formatLiveStripeActivationReport(AUTOIMMUNE_PRODUCT_SLUG) ?? "",
    /eligible — live Checkout — live Price/
  )
})

test("success page never grants entitlement", () => {
  assert.equal(successPageGrantsEntitlement(), false)
})

test("marketing consent is optional; transactional delivery is not a checkbox gate", () => {
  const withoutMarketing = checkoutConsentSchema.safeParse({
    fullName: "Tester",
    email: "tester@example.com",
    type: "product",
    productSlug: AUTOIMMUNE_PRODUCT_SLUG,
  })
  assert.equal(withoutMarketing.success, true)
  assert.equal(withoutMarketing.data?.marketingOptIn, false)

  const withMarketing = checkoutConsentSchema.safeParse({
    fullName: "Tester",
    email: "tester@example.com",
    marketingOptIn: true,
    type: "product",
    productSlug: AUTOIMMUNE_PRODUCT_SLUG,
  })
  assert.equal(withMarketing.success, true)
  assert.equal(withMarketing.data?.marketingOptIn, true)

  const formSource = readFileSync(
    new URL("../components/checkout-consent-form.tsx", import.meta.url),
    "utf8"
  )
  assert.match(formSource, /email your receipt and course-access information/)
  assert.match(formSource, /occasional Elevate updates and offers/)
  assert.doesNotMatch(
    formSource,
    /Yes, send me my access, receipts, and our emails/
  )
})

test("production secret keys reject test mode pairing helpers", () => {
  assert.equal(isStripeLiveSecretKey("sk_live_example"), true)
  assert.equal(isStripeTestSecretKey("sk_test_example"), true)
  assert.equal(isStripeLiveSecretKey("sk_test_example"), false)
  assert.equal(isStripeTestSecretKey("sk_live_example"), false)
})

test("complimentary download source label is distinct from purchased", () => {
  assert.equal(resolveDownloadSourceLabel("complimentary"), "Complimentary")
  assert.equal(resolveDownloadSourceLabel("purchase"), "Purchased")
})

test("complimentary-access script exposes grant-product and revoke-product", () => {
  const script = readFileSync(
    new URL("../../../../scripts/complimentary-access.mjs", import.meta.url),
    "utf8"
  )
  assert.match(script, /grant-product/)
  assert.match(script, /revoke-product/)
  assert.match(script, /source:\s*PRODUCT_ENTITLEMENT_SOURCE|source === PRODUCT_ENTITLEMENT_SOURCE/)
  assert.match(script, /complimentary/)
  assert.doesNotMatch(script, /orders\.insert|checkout\.sessions\.create/)
  assert.match(script, /stripeCallsMade:\s*0/)
})

test("Autoimmune purchase does not resolve as membership destination", () => {
  const destination = resolvePostPurchaseDestination({
    purchaseType: "product",
    productSlug: AUTOIMMUNE_PRODUCT_SLUG,
    productType: "masterclass",
    grantedCourseId: AUTOIMMUNE_COURSE_ID,
  })
  assert.notEqual(destination.href, "/dashboard/membership")
  assert.equal(destination.href, AUTOIMMUNE_LIBRARY_PATH)
})
