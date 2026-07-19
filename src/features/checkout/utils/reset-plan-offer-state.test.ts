import assert from "node:assert/strict"
import { test } from "node:test"

import {
  RESET_COURSE_ID,
  RESET_LIBRARY_PATH,
  RESET_PRODUCT_SLUG,
  resolvePostPurchaseDestination,
} from "../constants/destinations.ts"
import {
  CHECKOUT_PROCESSING_TIMEOUT_MESSAGE,
  buildSuccessViewFromLocalState,
  cancelledCheckoutCreatesEntitlement,
  shouldProcessWebhookEvent,
  successPageGrantsEntitlement,
} from "./checkout-success-state.ts"
import {
  RESET_PLAN_COURSE_HREF,
  RESET_PLAN_PRICE_LABEL,
  RESET_PLAN_PRICE_NOTE,
  RESET_PLAN_PRODUCT_SLUG,
  buildResetPlanOfferView,
  progressAwareResetPlanCtaLabel,
  resolveResetPlanAccessSource,
  resolveResetPlanProgressKind,
  shouldRefuseCheckoutForExistingResetAccess,
} from "./reset-plan-offer-state.ts"

const CHECKOUT_HREF = `/checkout/consent?type=product&slug=${RESET_PRODUCT_SLUG}`
const OTHER_PRODUCT_SLUG = "ebook-1"

test("reset plan constants stay aligned with checkout destinations", () => {
  assert.equal(RESET_PLAN_PRODUCT_SLUG, RESET_PRODUCT_SLUG)
  assert.equal(RESET_PLAN_COURSE_HREF, RESET_LIBRARY_PATH)
})

function purchaseFacts(
  overrides: Partial<Parameters<typeof buildResetPlanOfferView>[0]> = {}
) {
  return buildResetPlanOfferView({
    isAuthenticated: false,
    hasCourseAccess: false,
    accessSource: "none",
    isFulfillmentPending: false,
    progress: "none",
    checkoutHref: CHECKOUT_HREF,
    courseHref: RESET_LIBRARY_PATH,
    purchasePriceLabel: RESET_PLAN_PRICE_LABEL,
    ...overrides,
  })
}

// 1. Logged-out user sees price and purchase CTA
test("logged-out user sees price and purchase CTA", () => {
  const view = purchaseFacts({ isAuthenticated: false })

  assert.equal(view.state, "logged_out")
  assert.equal(view.showPrice, true)
  assert.equal(view.price, RESET_PLAN_PRICE_LABEL)
  assert.equal(view.priceNote, RESET_PLAN_PRICE_NOTE)
  assert.equal(view.ctaLabel, "Start Reset Plan")
  assert.equal(view.ctaHref, CHECKOUT_HREF)
  assert.equal(view.allowsCheckout, true)
})

// 2. Logged-in user without access sees price and purchase CTA
test("logged-in user without access sees price and purchase CTA", () => {
  const view = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: false,
    accessSource: "none",
  })

  assert.equal(view.state, "no_access")
  assert.equal(view.showPrice, true)
  assert.equal(view.price, RESET_PLAN_PRICE_LABEL)
  assert.equal(view.priceNote, RESET_PLAN_PRICE_NOTE)
  assert.equal(view.ctaLabel, "Start Reset Plan")
  assert.equal(view.allowsCheckout, true)
})

// 3. Direct purchaser sees Purchased and course CTA
test("direct purchaser sees Purchased and course CTA", () => {
  const view = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: true,
    accessSource: "purchase",
    progress: "in_progress",
  })

  assert.equal(view.state, "purchased")
  assert.equal(view.showPrice, false)
  assert.equal(view.price, "Purchased")
  assert.equal(view.priceNote, null)
  assert.equal(view.ctaLabel, "Continue Reset Plan")
  assert.equal(view.ctaHref, RESET_LIBRARY_PATH)
  assert.equal(view.allowsCheckout, false)
})

// 4. Plan-entitled user sees Included in your plan
test("plan-entitled user sees Included in your plan", () => {
  const view = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: true,
    accessSource: "plan",
    progress: "none",
  })

  assert.equal(view.state, "included_in_plan")
  assert.equal(view.price, "Included in your plan")
  assert.equal(view.ctaLabel, "Start Reset Plan")
  assert.equal(view.ctaHref, RESET_LIBRARY_PATH)
  assert.equal(view.allowsCheckout, false)
  assert.doesNotMatch(view.price, /complimentary|tester|launch/i)
})

// 5. Complimentary entitlement sees customer-safe Access active
test("complimentary entitlement sees customer-safe Access active", () => {
  const view = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: true,
    accessSource: "complimentary",
    progress: "in_progress",
  })

  assert.equal(view.state, "access_active")
  assert.equal(view.price, "Access active")
  assert.equal(view.ctaLabel, "Continue Reset Plan")
  assert.equal(view.allowsCheckout, false)
  assert.doesNotMatch(view.price, /complimentary|tester|comp_launch|grant/i)
  assert.equal(
    resolveResetPlanAccessSource({
      hasCourseAccess: true,
      viaPurchase: false,
      viaComplimentary: true,
      viaSubscription: true,
    }),
    "complimentary"
  )
})

// 6. Entitled user never creates a Checkout Session (allowsCheckout false)
test("entitled user never allows Checkout Session creation from card", () => {
  for (const accessSource of ["purchase", "plan", "complimentary", "other"] as const) {
    const view = purchaseFacts({
      isAuthenticated: true,
      hasCourseAccess: true,
      accessSource,
      progress: "none",
    })

    assert.equal(view.allowsCheckout, false)
    assert.equal(view.ctaHref, RESET_LIBRARY_PATH)
    assert.notEqual(view.ctaHref, CHECKOUT_HREF)
  }

  assert.equal(
    shouldRefuseCheckoutForExistingResetAccess({
      productSlug: RESET_PRODUCT_SLUG,
      grantedCourseId: RESET_COURSE_ID,
      hasCourseAccess: true,
    }),
    true
  )
})

// 7. Direct server-action invocation by entitled user returns course destination
test("entitled checkout refusal returns trusted course destination facts", () => {
  assert.equal(
    shouldRefuseCheckoutForExistingResetAccess({
      productSlug: RESET_PRODUCT_SLUG,
      grantedCourseId: RESET_COURSE_ID,
      hasCourseAccess: true,
    }),
    true
  )

  const entitledView = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: true,
    accessSource: "plan",
  })

  assert.equal(entitledView.ctaHref, `/dashboard/library/${RESET_COURSE_ID}`)
  assert.equal(entitledView.allowsCheckout, false)
})

// 8. Non-entitled user can still create a test Checkout Session
test("non-entitled user can still proceed to Checkout", () => {
  assert.equal(
    shouldRefuseCheckoutForExistingResetAccess({
      productSlug: RESET_PRODUCT_SLUG,
      grantedCourseId: RESET_COURSE_ID,
      hasCourseAccess: false,
    }),
    false
  )

  const view = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: false,
  })

  assert.equal(view.allowsCheckout, true)
  assert.equal(view.ctaHref, CHECKOUT_HREF)
})

// 9. Expired/revoked access does not appear active
test("expired or revoked access does not appear active", () => {
  const view = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: false,
    accessSource: "none",
    isFulfillmentPending: false,
  })

  assert.equal(view.state, "no_access")
  assert.notEqual(view.price, "Access active")
  assert.notEqual(view.price, "Included in your plan")
  assert.notEqual(view.price, "Purchased")
  assert.equal(view.showPrice, true)
  assert.equal(view.allowsCheckout, true)

  assert.equal(
    resolveResetPlanAccessSource({
      hasCourseAccess: false,
      viaPurchase: false,
      viaComplimentary: false,
      viaSubscription: false,
    }),
    "none"
  )
})

// 10. Progress changes CTA between Start, Continue, and Review
test("progress changes CTA between Start, Continue, and Review", () => {
  assert.equal(progressAwareResetPlanCtaLabel("none"), "Start Reset Plan")
  assert.equal(progressAwareResetPlanCtaLabel("in_progress"), "Continue Reset Plan")
  assert.equal(progressAwareResetPlanCtaLabel("complete"), "Review Reset Plan")

  assert.equal(
    resolveResetPlanProgressKind({ completedLessons: 0, progressPercentage: 0 }),
    "none"
  )
  assert.equal(
    resolveResetPlanProgressKind({ completedLessons: 2, progressPercentage: 40 }),
    "in_progress"
  )
  assert.equal(
    resolveResetPlanProgressKind({ completedLessons: 10, progressPercentage: 100 }),
    "complete"
  )

  assert.equal(
    purchaseFacts({
      isAuthenticated: true,
      hasCourseAccess: true,
      accessSource: "plan",
      progress: "complete",
    }).ctaLabel,
    "Review Reset Plan"
  )
})

// 11. No cross-user caching (pure builder is request-local / input-driven)
test("offer view is derived only from supplied facts with no shared mutable state", () => {
  const userA = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: true,
    accessSource: "plan",
    progress: "in_progress",
  })
  const userB = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: false,
    accessSource: "none",
  })

  assert.equal(userA.price, "Included in your plan")
  assert.equal(userB.price, RESET_PLAN_PRICE_LABEL)
  assert.notEqual(userA.ctaHref, userB.ctaHref)
  assert.equal(userA.allowsCheckout, false)
  assert.equal(userB.allowsCheckout, true)
})

// 12. Other products retain their correct behavior (no Reset refusal)
test("other products are not blocked by Reset course access alone", () => {
  assert.equal(
    shouldRefuseCheckoutForExistingResetAccess({
      productSlug: OTHER_PRODUCT_SLUG,
      grantedCourseId: null,
      hasCourseAccess: true,
    }),
    false
  )

  // Course-granting non-Reset product still refuses when that course is entitled.
  assert.equal(
    shouldRefuseCheckoutForExistingResetAccess({
      productSlug: "other-course-bundle",
      grantedCourseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      hasCourseAccess: true,
    }),
    true
  )
})

// 13. Stripe webhook and fulfillment behavior remain unchanged
test("Stripe webhook and fulfillment helpers remain unchanged", () => {
  assert.equal(successPageGrantsEntitlement(), false)
  assert.equal(cancelledCheckoutCreatesEntitlement(), false)

  assert.equal(
    shouldProcessWebhookEvent({
      recordStatus: "duplicate",
      existingStatus: "processed",
    }),
    "skip_duplicate"
  )

  const processing = buildSuccessViewFromLocalState({
    ownershipOk: true,
    accessReady: false,
    paymentOk: true,
    purchaseType: "product",
    productName: "7-Day Elevated Reset",
    destination: resolvePostPurchaseDestination({
      purchaseType: "product",
      productSlug: RESET_PRODUCT_SLUG,
      grantedCourseId: RESET_COURSE_ID,
    }),
  })

  assert.equal(processing.state, "processing")
  assert.match(processing.message, /activating your access/i)
  assert.equal(typeof CHECKOUT_PROCESSING_TIMEOUT_MESSAGE, "string")

  const activatingCard = purchaseFacts({
    isAuthenticated: true,
    hasCourseAccess: false,
    isFulfillmentPending: true,
  })

  assert.equal(activatingCard.state, "activating")
  assert.equal(activatingCard.price, "Activating access…")
  assert.equal(activatingCard.allowsCheckout, false)
})
