import assert from "node:assert/strict"
import { test } from "node:test"

import {
  COMP_PREVIEW_MARKER_PREFIX,
  combinePreviewDecision,
  deriveLessonAvailability,
  evaluatePreviewEligibility,
  hasActiveCompPreviewSubscription,
  isActiveSubscription,
  isCompPreviewMarker,
  selectContentStatuses,
  type SubscriptionSnapshot,
} from "./preview-eligibility.ts"

const NOW = Date.parse("2026-07-15T00:00:00.000Z")
const FUTURE = "2026-12-31T00:00:00.000Z"
const PAST = "2026-01-01T00:00:00.000Z"

function compSub(overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    status: "active",
    current_period_end: FUTURE,
    cancel_at_period_end: false,
    stripe_subscription_id: `${COMP_PREVIEW_MARKER_PREFIX}profile-123`,
    ...overrides,
  }
}

function planSub(overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    status: "active",
    current_period_end: FUTURE,
    cancel_at_period_end: false,
    stripe_subscription_id: "sub_live_realstripeid",
    ...overrides,
  }
}

// 1. Admin is eligible to preview without any subscription.
test("admin role is eligible for preview", () => {
  assert.equal(
    evaluatePreviewEligibility({ role: "admin", subscriptions: [] }, NOW),
    true
  )
})

// 2. Super admin is eligible to preview.
test("super_admin role is eligible for preview", () => {
  assert.equal(
    evaluatePreviewEligibility({ role: "super_admin", subscriptions: [] }, NOW),
    true
  )
})

// 3. Ordinary user with no subscriptions is not eligible.
test("ordinary user with no subscriptions is not eligible", () => {
  assert.equal(
    evaluatePreviewEligibility({ role: "user", subscriptions: [] }, NOW),
    false
  )
})

// 4. Ordinary user with an active complimentary marker subscription is eligible.
test("ordinary user with active comp subscription is eligible", () => {
  assert.equal(
    evaluatePreviewEligibility({ role: "user", subscriptions: [compSub()] }, NOW),
    true
  )
})

// 5. A generic active plan-3 (real Stripe) subscription does NOT grant preview.
test("active non-comp plan subscription does not grant preview", () => {
  assert.equal(
    evaluatePreviewEligibility({ role: "user", subscriptions: [planSub()] }, NOW),
    false
  )
})

// 6. Comp marker whose billing period has elapsed is not eligible.
test("expired comp subscription is not eligible", () => {
  assert.equal(
    evaluatePreviewEligibility(
      { role: "user", subscriptions: [compSub({ current_period_end: PAST })] },
      NOW
    ),
    false
  )
})

// 7. Canceled comp subscription with elapsed period is not eligible.
test("canceled+expired comp subscription is not eligible", () => {
  assert.equal(
    evaluatePreviewEligibility(
      {
        role: "user",
        subscriptions: [
          compSub({ status: "canceled", current_period_end: PAST }),
        ],
      },
      NOW
    ),
    false
  )
})

// 8. Comp marker set to cancel at period end but still within period is eligible.
test("comp subscription canceling at future period end is still eligible", () => {
  assert.equal(
    evaluatePreviewEligibility(
      {
        role: "user",
        subscriptions: [
          compSub({ status: "canceled", cancel_at_period_end: true }),
        ],
      },
      NOW
    ),
    true
  )
})

// 9. The preview request flag alone (eligible=false) never authorizes preview.
test("preview=1 flag alone does not authorize preview", () => {
  assert.equal(combinePreviewDecision(true, false), false)
})

// 10. Eligible profile that did not request preview stays in published-only mode.
test("eligible profile without request stays non-preview", () => {
  assert.equal(combinePreviewDecision(false, true), false)
})

// 11. Requested + eligible authorizes preview.
test("requested and eligible authorizes preview", () => {
  assert.equal(combinePreviewDecision(true, true), true)
})

// 12. Non-preview content query is restricted to published only.
test("non-preview status selection is published only", () => {
  assert.deepEqual(selectContentStatuses(false), ["published"])
})

// 13. Authorized preview content query includes drafts (never archived).
test("preview status selection includes draft but not archived", () => {
  const statuses = selectContentStatuses(true)
  assert.deepEqual(statuses, ["published", "draft"])
  assert.equal(statuses.includes("archived" as never), false)
})

// 14. A published lesson in a published module is available.
test("published lesson in published module is available", () => {
  assert.equal(deriveLessonAvailability("published", "published"), true)
})

// 15. A draft lesson is never available (no player/token/completion).
test("draft lesson is not available", () => {
  assert.equal(deriveLessonAvailability("draft", "published"), false)
})

// 16. A published lesson inside a draft module is not available.
test("published lesson in draft module is not available", () => {
  assert.equal(deriveLessonAvailability("published", "draft"), false)
})

// 17. The comp marker check keys off the exact prefix, not arbitrary strings.
test("comp marker detection is prefix-based, not email or plan based", () => {
  assert.equal(isCompPreviewMarker(`${COMP_PREVIEW_MARKER_PREFIX}abc`), true)
  assert.equal(isCompPreviewMarker("tester@example.com"), false)
  assert.equal(isCompPreviewMarker("sub_live_realstripeid"), false)
  assert.equal(isCompPreviewMarker(null), false)
})

// 18. Mixed subscriptions: an active comp grant among others is detected.
test("active comp grant is detected among mixed subscriptions", () => {
  assert.equal(
    hasActiveCompPreviewSubscription([planSub(), compSub()], NOW),
    true
  )
  assert.equal(hasActiveCompPreviewSubscription([planSub()], NOW), false)
})

// 19. isActiveSubscription treats an elapsed period as inactive regardless of status.
test("isActiveSubscription rejects elapsed period", () => {
  assert.equal(
    isActiveSubscription(
      { status: "active", current_period_end: PAST, cancel_at_period_end: false },
      NOW
    ),
    false
  )
  assert.equal(
    isActiveSubscription(
      { status: "trialing", current_period_end: FUTURE, cancel_at_period_end: false },
      NOW
    ),
    true
  )
})
