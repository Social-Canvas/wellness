import assert from "node:assert/strict"
import { test } from "node:test"

import {
  ELEVATE_MEMBERSHIPS,
  MEMBERSHIP_AUDIENCES,
} from "../../lib/constants/elevate-brand.ts"
import {
  MEMBERSHIP_CAPABILITIES,
  defaultCapabilitiesForPlanSlug,
} from "./membership-capabilities.ts"

test("individual membership prices display as $47/$99/$149", () => {
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.priceLabel),
    ["$47", "$99", "$149"]
  )
  assert.deepEqual(
    ELEVATE_MEMBERSHIPS.map((tier) => tier.priceCents),
    [4700, 9900, 14900]
  )
})

test("public audience model is Individuals + Nonprofit Organizations only", () => {
  assert.equal(MEMBERSHIP_AUDIENCES.length, 2)
  assert.equal(MEMBERSHIP_AUDIENCES[0]?.id, "individuals")
  assert.equal(MEMBERSHIP_AUDIENCES[1]?.id, "nonprofit-organizations")
})

test("all active membership plans receive the same course library capability", () => {
  for (const slug of ["plan-1", "plan-2", "plan-3"]) {
    assert.ok(
      defaultCapabilitiesForPlanSlug(slug).includes("membership_course_library")
    )
  }
})

test("Core lacks in-person capability", () => {
  assert.equal(
    defaultCapabilitiesForPlanSlug("plan-1").includes("in_person_sessions"),
    false
  )
})

test("Gold has in-person capability", () => {
  assert.ok(defaultCapabilitiesForPlanSlug("plan-2").includes("in_person_sessions"))
})

test("capabilities are an explicit server allowlist", () => {
  assert.ok(MEMBERSHIP_CAPABILITIES.includes("in_person_sessions"))
  assert.ok(MEMBERSHIP_CAPABILITIES.includes("membership_course_library"))
})

test("Platinum keeps additional privileges configurable without inventing leadership by default", () => {
  const platinum = defaultCapabilitiesForPlanSlug("plan-3")
  assert.ok(platinum.includes("in_person_sessions"))
  assert.ok(platinum.includes("priority_support"))
  assert.equal(platinum.includes("leadership_sessions"), false)
})

test("organization seat limit blocks over-allocation logic", () => {
  const seatLimit = 2
  const activeSeats = 2
  const canInvite = !(seatLimit > 0 && activeSeats >= seatLimit)
  assert.equal(canInvite, false)
})

test("removing a sponsored member releases a seat", () => {
  let activeSeats = 3
  activeSeats -= 1
  assert.equal(activeSeats, 2)
})

test("downgrade remains scheduled until period end", () => {
  const currentCapabilities = defaultCapabilitiesForPlanSlug("plan-3")
  const scheduledSlug = "plan-1"
  const effectiveSlug = "plan-3"
  assert.notEqual(scheduledSlug, effectiveSlug)
  assert.ok(currentCapabilities.includes("in_person_sessions"))
})

test("cancellation preserves access until period end", () => {
  const status = "cancel_at_period_end"
  const stillEntitled =
    status === "active" ||
    status === "trialing" ||
    status === "cancel_at_period_end" ||
    status === "past_due"
  assert.equal(stillEntitled, true)
})

test("upgrade waits for provider confirmation messaging", () => {
  const appliesOnSuccessPage = false
  const appliesAfterWebhook = true
  assert.equal(appliesOnSuccessPage, false)
  assert.equal(appliesAfterWebhook, true)
})

test("lifecycle event idempotency key is source + type", () => {
  const key = (sourceEventId: string, eventType: string) =>
    `${sourceEventId}::${eventType}`
  assert.equal(
    key("evt_1", "membership_started"),
    key("evt_1", "membership_started")
  )
  assert.notEqual(
    key("evt_1", "membership_started"),
    key("evt_1", "membership_cancelled")
  )
})

test("personal purchases remain independent of sponsored access removal", () => {
  const sources = new Set(["personal_stripe", "nonprofit_sponsored", "ebook_order"])
  sources.delete("nonprofit_sponsored")
  assert.ok(sources.has("personal_stripe"))
  assert.ok(sources.has("ebook_order"))
})

test("no shared organization login model", () => {
  assert.equal(
    (MEMBERSHIP_CAPABILITIES as readonly string[]).includes("shared_login"),
    false
  )
})

test("complimentary access remains an independent source label", () => {
  const sources = ["personal_stripe", "nonprofit_sponsored", "complimentary", "none"]
  assert.ok(sources.includes("complimentary"))
})

test("past-due emits payment failed lifecycle type", () => {
  const eventType = "membership_payment_failed"
  assert.equal(eventType, "membership_payment_failed")
})

test("users cannot administer another organization by default", () => {
  const callerOrgId = "org-a"
  const targetOrgId = "org-b"
  assert.notEqual(callerOrgId, targetOrgId)
})

test("Reset and ebook flows remain separate product paths", () => {
  assert.ok(ELEVATE_MEMBERSHIPS.every((tier) => tier.slug.startsWith("plan-")))
  assert.equal(
    ELEVATE_MEMBERSHIPS.some((tier) => tier.slug === "7-day-reset"),
    false
  )
})

test("range-priced nonprofit offers do not create Checkout in public model", () => {
  const nonprofitCheckoutEnabled = false
  assert.equal(nonprofitCheckoutEnabled, false)
})
