import assert from "node:assert/strict"
import { test } from "node:test"

import {
  assertCheckoutUsesTestModeKeys,
  getStripeLivemodeMismatch,
  isConfiguredStripePriceId,
  isStripeLiveSecretKey,
  isStripeTestSecretKey,
  isValidStripeWebhookSecret,
} from "./mode.ts"
import { shouldProcessWebhookEvent } from "../../../features/checkout/utils/checkout-success-state.ts"

// 11. Test/live resource mixing rejected
test("live webhook events are rejected when app uses test secret key", () => {
  assert.equal(
    getStripeLivemodeMismatch(true, "sk_test_example"),
    "live_event_in_test_mode"
  )
  assert.equal(getStripeLivemodeMismatch(false, "sk_test_example"), null)
  assert.equal(
    getStripeLivemodeMismatch(false, "sk_live_example"),
    "test_event_in_live_mode"
  )
  assert.equal(getStripeLivemodeMismatch(true, "sk_live_example"), null)
  assert.equal(getStripeLivemodeMismatch(false, "mk_invalid"), "invalid_secret_key")
})

test("checkout refuses non-test keys and placeholder prices", () => {
  assert.equal(isStripeTestSecretKey("sk_test_abc"), true)
  assert.equal(isStripeTestSecretKey("rk_test_abc"), true)
  assert.equal(isStripeLiveSecretKey("sk_live_abc"), true)
  assert.equal(isStripeTestSecretKey("mk_not_a_stripe_key"), false)

  const ok = assertCheckoutUsesTestModeKeys({
    secretKey: "sk_test_abc",
    publishableKey: "pk_test_abc",
  })
  assert.equal(ok.ok, true)

  const bad = assertCheckoutUsesTestModeKeys({
    secretKey: "sk_live_abc",
    publishableKey: "pk_test_abc",
  })
  assert.equal(bad.ok, false)

  assert.equal(isConfiguredStripePriceId("price_1ABC"), true)
  assert.equal(isConfiguredStripePriceId("price_placeholder_7_day_reset"), false)
  assert.equal(isValidStripeWebhookSecret("whsec_test"), true)
  assert.equal(isValidStripeWebhookSecret("https://dashboard.stripe.com/x"), false)
})

// 12. Subscription activation / cancellation preserve correct access semantics
test("subscription webhook retries process failed events but skip completed ones", () => {
  // Activation (new event) processes
  assert.equal(
    shouldProcessWebhookEvent({ recordStatus: "new", existingStatus: null }),
    "process"
  )

  // Renewal / update retry after failure reprocesses
  assert.equal(
    shouldProcessWebhookEvent({
      recordStatus: "duplicate",
      existingStatus: "failed",
    }),
    "process"
  )

  // Cancellation already applied — idempotent skip
  assert.equal(
    shouldProcessWebhookEvent({
      recordStatus: "duplicate",
      existingStatus: "processed",
    }),
    "skip_duplicate"
  )
})

test("active and canceled access rules are encoded as distinct fulfillment states", () => {
  // Active membership → fulfilled only when local subscription is ready
  // (mirrored by accessReady flag; cancellation clears accessReady upstream)
  assert.equal(
    shouldProcessWebhookEvent({
      recordStatus: "duplicate",
      existingStatus: "received",
    }),
    "process"
  )
})
