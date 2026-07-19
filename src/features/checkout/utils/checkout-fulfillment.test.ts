import assert from "node:assert/strict"
import { test } from "node:test"

import {
  RESET_COURSE_ID,
  RESET_LIBRARY_PATH,
  RESET_PRODUCT_SLUG,
  isResetPurchase,
  resolvePostPurchaseDestination,
} from "../constants/destinations.ts"
import {
  CHECKOUT_PROCESSING_TIMEOUT_MESSAGE,
  buildSuccessViewFromLocalState,
  cancelledCheckoutCreatesEntitlement,
  sessionBelongsToUser,
  shouldProcessWebhookEvent,
  successPageGrantsEntitlement,
} from "./checkout-success-state.ts"
import { isSafeRelativePath, sanitizeReturnPath } from "./safe-return-path.ts"
import {
  CHECKOUT_SESSION_ID_PLACEHOLDER,
  buildCheckoutCancelUrlFromBase,
  buildCheckoutSuccessUrlFromBase,
} from "./stripe-return-url-builders.ts"

const USER_A = "11111111-1111-4111-8111-111111111111"
const USER_B = "22222222-2222-4222-8222-222222222222"

function resetDestination() {
  return resolvePostPurchaseDestination({
    purchaseType: "product",
    productSlug: RESET_PRODUCT_SLUG,
    grantedCourseId: RESET_COURSE_ID,
  })
}

// 1. Successful checkout → fulfilled view with access ready (entitlement already present)
test("successful checkout creates fulfilled view when access is ready", () => {
  const view = buildSuccessViewFromLocalState({
    ownershipOk: true,
    accessReady: true,
    paymentOk: true,
    purchaseType: "product",
    productName: "7-Day Elevated Reset",
    destination: resetDestination(),
  })

  assert.equal(view.state, "fulfilled")
  assert.equal(view.accessReady, true)
  assert.equal(view.message, "Payment successful — your access is ready.")
  assert.equal(view.destination?.href, RESET_LIBRARY_PATH)
})

// 2. Duplicate webhook is idempotent
test("duplicate webhook event already processed is skipped", () => {
  assert.equal(
    shouldProcessWebhookEvent({
      recordStatus: "duplicate",
      existingStatus: "processed",
    }),
    "skip_duplicate"
  )

  assert.equal(
    shouldProcessWebhookEvent({
      recordStatus: "duplicate",
      existingStatus: "ignored",
    }),
    "skip_duplicate"
  )

  assert.equal(
    shouldProcessWebhookEvent({
      recordStatus: "new",
      existingStatus: null,
    }),
    "process"
  )

  assert.equal(
    shouldProcessWebhookEvent({
      recordStatus: "duplicate",
      existingStatus: "failed",
    }),
    "process"
  )
})

// 3. Success page does not grant access
test("success page never grants entitlement", () => {
  assert.equal(successPageGrantsEntitlement(), false)

  const view = buildSuccessViewFromLocalState({
    ownershipOk: true,
    accessReady: false,
    paymentOk: true,
    purchaseType: "product",
    productName: "Ebook",
    destination: resolvePostPurchaseDestination({
      purchaseType: "product",
      productType: "ebook",
    }),
  })

  assert.equal(view.state, "processing")
  assert.equal(view.accessReady, false)
})

// 4. Session must belong to authenticated user
test("session must belong to authenticated user", () => {
  assert.equal(
    sessionBelongsToUser(
      { metadata: { profile_id: USER_A }, client_reference_id: USER_A },
      USER_A
    ),
    true
  )

  assert.equal(
    sessionBelongsToUser(
      { metadata: { profile_id: USER_A }, client_reference_id: USER_A },
      USER_B
    ),
    false
  )

  const stolen = buildSuccessViewFromLocalState({
    ownershipOk: false,
    accessReady: true,
    paymentOk: true,
    purchaseType: "product",
    productName: "Secret",
    destination: resetDestination(),
  })

  assert.equal(stolen.state, "invalid")
  assert.equal(stolen.destination, null)
})

// 5. Invalid session ID fails safely
test("invalid ownership or session fails with generic invalid state", () => {
  const view = buildSuccessViewFromLocalState({
    ownershipOk: false,
    accessReady: false,
    paymentOk: false,
    purchaseType: "membership",
    productName: "x",
    destination: resolvePostPurchaseDestination({ purchaseType: "membership" }),
  })

  assert.equal(view.state, "invalid")
  assert.match(view.message, /could not verify/i)
  assert.doesNotMatch(view.message, /sk_live_|whsec_|pi_/)
})

// 6. Processing state handles webhook delay
test("processing state handles webhook delay then timeout copy", () => {
  const delayed = buildSuccessViewFromLocalState({
    ownershipOk: true,
    accessReady: false,
    paymentOk: true,
    purchaseType: "product",
    productName: "7-Day Elevated Reset",
    destination: resetDestination(),
  })

  assert.equal(delayed.state, "processing")
  assert.match(delayed.message, /activating your access/i)
  assert.equal(
    CHECKOUT_PROCESSING_TIMEOUT_MESSAGE,
    "Your payment was received. Access is still being activated."
  )
})

// 7. Reset destination is server-controlled
test("reset destination is server-controlled course path", () => {
  const dest = resolvePostPurchaseDestination({
    purchaseType: "product",
    productSlug: RESET_PRODUCT_SLUG,
    grantedCourseId: RESET_COURSE_ID,
  })

  assert.equal(dest.href, `/dashboard/library/${RESET_COURSE_ID}`)
  assert.equal(dest.label, "Open the 7-Day Elevated Reset")
  assert.equal(dest.autoRedirect, true)
  assert.equal(isResetPurchase({ productSlug: "ebook-1" }), false)
})

// 8. Open redirects are impossible
test("open redirects are rejected by safe path helpers and destinations", () => {
  assert.equal(isSafeRelativePath("//evil.com"), false)
  assert.equal(isSafeRelativePath("https://evil.com"), false)
  assert.equal(isSafeRelativePath("/\\evil"), false)
  assert.equal(sanitizeReturnPath("//evil.com", "/shop"), "/shop")
  assert.equal(sanitizeReturnPath("/programs", "/shop"), "/programs")

  const membership = resolvePostPurchaseDestination({ purchaseType: "membership" })
  assert.equal(membership.href.startsWith("/"), true)
  assert.equal(membership.href.includes("://"), false)

  // Browser-supplied courseId must not change destination
  const forged = resolvePostPurchaseDestination({
    purchaseType: "product",
    productSlug: "ebook-1",
    productType: "ebook",
    grantedCourseId: "00000000-0000-4000-8000-000000000099",
  })
  assert.equal(forged.href, "/dashboard/downloads")
  assert.notEqual(forged.href, `/dashboard/library/00000000-0000-4000-8000-000000000099`)
})

// 9. Cancelled checkout creates no entitlement
test("cancelled checkout creates no entitlement", () => {
  assert.equal(cancelledCheckoutCreatesEntitlement(), false)

  const cancelUrl = buildCheckoutCancelUrlFromBase("http://localhost:3000", {
    type: "product",
  })
  assert.equal(cancelUrl, "http://localhost:3000/checkout/cancelled?type=product")
})

// 10. Non-entitled user remains denied (accessReady false)
test("non-entitled user remains denied on success view", () => {
  const view = buildSuccessViewFromLocalState({
    ownershipOk: true,
    accessReady: false,
    paymentOk: true,
    purchaseType: "membership",
    productName: "Individual",
    destination: resolvePostPurchaseDestination({ purchaseType: "membership" }),
  })

  assert.equal(view.accessReady, false)
  assert.equal(view.state, "processing")
})

// Success URL shape
test("success url preserves Checkout Session id placeholder", () => {
  const url = buildCheckoutSuccessUrlFromBase("https://app.example.com")
  assert.equal(
    url,
    `https://app.example.com/checkout/success?session_id=${CHECKOUT_SESSION_ID_PLACEHOLDER}`
  )
  assert.ok(url.includes("{CHECKOUT_SESSION_ID}"))
  assert.ok(!url.includes("returnTo="))
})
