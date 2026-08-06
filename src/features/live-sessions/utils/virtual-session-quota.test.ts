import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import { ELEVATE_MEMBERSHIPS } from "../../../lib/constants/elevate-brand.ts"
import { defaultCapabilitiesForPlanSlug } from "../../../server/services/membership-capabilities.ts"
import {
  FORBIDDEN_IN_PERSON_PERIOD_PUBLIC_COPY,
  IN_PERSON_PUBLIC_COPY,
  inPersonExperienceConfigForPlan,
  inPersonResetPeriodIsConfirmed,
  publicInPersonCopyOmitsUnconfirmedPeriod,
} from "./in-person-entitlement.ts"
import {
  trialGrantsFutureSessions,
  trialGrantsMembershipStatus,
  trialGrantsRecordingsAccess,
} from "./live-sessions.ts"
import {
  buildVirtualLiveSessionUsageSnapshot,
  canJoinWithQuotaReservation,
  canReserveUnderQuota,
  countQuotaConsumingReservations,
  formatVirtualSessionAllowanceCopy,
  GOLD_MONTHLY_PERIOD_SEMANTICS_STATUS,
  isUnlimitedVirtualLiveAccess,
  membershipReservationIsStripePurchase,
  resolveCalendarMonthPeriod,
  resolveQuotaPeriodBounds,
  shouldEnforceVirtualSessionQuota,
  trialConsumesMembershipQuota,
  virtualLiveSessionQuotaForPlan,
} from "./virtual-session-quota.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

// 1. Homepage uses Testimonials
test("1. Homepage uses Testimonials", () => {
  const data = read(
    "src/features/marketing-testimonials/data/testimonials.ts"
  )
  assert.match(data, /eyebrow:\s*"TESTIMONIALS"/)
  assert.match(data, /id:\s*"testimonials"/)
  assert.doesNotMatch(data, /MEMBER STORIES/)
})

// 2. No testimonial is labeled Member story
test("2. No testimonial is labeled Member story", () => {
  const data = read(
    "src/features/marketing-testimonials/data/testimonials.ts"
  )
  const utils = read(
    "src/features/marketing-testimonials/utils/testimonials.ts"
  )
  assert.doesNotMatch(data, /Member story/i)
  assert.doesNotMatch(utils, /Member story/i)
  assert.match(utils, /"Testimonial"/)
})

// 3. Testimonial playback behavior is unchanged
test("3. Testimonial playback behavior is unchanged", () => {
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /shouldPlayActiveTestimonial/)
  assert.match(carousel, /shouldAutoRotateTestimonials/)
  assert.match(carousel, /Mute testimonial|muteControlLabel/)
  assert.equal(
    read("src/features/marketing-testimonials/data/testimonials.ts").match(
      /muxPlaybackId:/g
    )?.length,
    6
  )
})

// 4. Gold configuration supports a limit of 2
test("4. Gold configuration supports a limit of 2", () => {
  const gold = virtualLiveSessionQuotaForPlan("plan-2")
  assert.ok(gold)
  assert.equal(gold.mode, "limited")
  assert.equal(gold.limit, 2)
  assert.equal(gold.virtualLiveSessionsIncluded, true)
  assert.equal(gold.quotaEnforcementActive, true)
  assert.equal(gold.limitPeriod, "calendar_month")
})

// 5. Gold cannot reserve a third included session in the same period
test("5. Gold cannot reserve a third included session in the same period", () => {
  const gold = virtualLiveSessionQuotaForPlan("plan-2")!
  const period = resolveCalendarMonthPeriod(new Date("2026-08-15T12:00:00Z"))
  const used = countQuotaConsumingReservations({
    reservations: [
      {
        status: "confirmed",
        registrationType: "member",
        liveClassStatus: "published",
        liveClassStartsAt: "2026-08-05T15:00:00.000Z",
      },
      {
        status: "attended",
        registrationType: "member",
        liveClassStatus: "published",
        liveClassStartsAt: "2026-08-12T15:00:00.000Z",
      },
    ],
    periodStart: period.start,
    periodEnd: period.end,
  })
  assert.equal(used, 2)
  const usage = buildVirtualLiveSessionUsageSnapshot({
    config: gold,
    used,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: "month",
  })
  const gate = canReserveUnderQuota({
    usage,
    alreadyReservedForSession: false,
  })
  assert.equal(gate.ok, false)
  if (!gate.ok) {
    assert.match(gate.reason, /Upgrade to Platinum/)
  }
})

// 6. Concurrent reservations cannot exceed the allowance (pure race model)
test("6. Concurrent reservations cannot exceed the allowance", () => {
  const gold = virtualLiveSessionQuotaForPlan("plan-2")!
  const usageAtLimit = buildVirtualLiveSessionUsageSnapshot({
    config: gold,
    used: 2,
    periodStart: new Date("2026-08-01T00:00:00Z"),
    periodEnd: new Date("2026-09-01T00:00:00Z"),
    periodLabel: "month",
  })
  const a = canReserveUnderQuota({
    usage: usageAtLimit,
    alreadyReservedForSession: false,
  })
  const b = canReserveUnderQuota({
    usage: usageAtLimit,
    alreadyReservedForSession: false,
  })
  assert.equal(a.ok, false)
  assert.equal(b.ok, false)
  const migration = read(
    "supabase/migrations/20260807010000_virtual_live_session_quota.sql"
  )
  assert.match(migration, /pg_advisory_xact_lock/)
  assert.match(migration, /reserve_virtual_live_session/)
})

// 7. Cancelling a reservation releases allowance
test("7. Cancelling a reservation releases allowance", () => {
  const period = resolveCalendarMonthPeriod(new Date("2026-08-15T12:00:00Z"))
  const used = countQuotaConsumingReservations({
    reservations: [
      {
        status: "cancelled",
        registrationType: "member",
        liveClassStatus: "published",
        liveClassStartsAt: "2026-08-05T15:00:00.000Z",
      },
      {
        status: "confirmed",
        registrationType: "member",
        liveClassStatus: "published",
        liveClassStartsAt: "2026-08-12T15:00:00.000Z",
      },
    ],
    periodStart: period.start,
    periodEnd: period.end,
  })
  assert.equal(used, 1)
  const migration = read(
    "supabase/migrations/20260807010000_virtual_live_session_quota.sql"
  )
  assert.match(migration, /cancel_virtual_live_session_reservation/)
})

// 8. Cancelled session does not consume allowance
test("8. Cancelled session does not consume allowance", () => {
  const period = resolveCalendarMonthPeriod(new Date("2026-08-15T12:00:00Z"))
  const used = countQuotaConsumingReservations({
    reservations: [
      {
        status: "confirmed",
        registrationType: "member",
        liveClassStatus: "archived",
        liveClassStartsAt: "2026-08-05T15:00:00.000Z",
      },
      {
        status: "confirmed",
        registrationType: "member",
        liveClassStatus: "published",
        liveClassStartsAt: "2026-08-12T15:00:00.000Z",
      },
    ],
    periodStart: period.start,
    periodEnd: period.end,
  })
  assert.equal(used, 1)
})

// 9. Platinum supports unlimited virtual sessions
test("9. Platinum supports unlimited virtual sessions", () => {
  const platinum = virtualLiveSessionQuotaForPlan("plan-3")!
  assert.equal(platinum.mode, "unlimited")
  assert.equal(platinum.limit, null)
  assert.equal(isUnlimitedVirtualLiveAccess(platinum), true)
  assert.equal(platinum.quotaEnforcementActive, false)
  const usage = buildVirtualLiveSessionUsageSnapshot({
    config: platinum,
    used: 99,
    periodStart: null,
    periodEnd: null,
    periodLabel: "none",
  })
  assert.equal(
    formatVirtualSessionAllowanceCopy(usage),
    "Unlimited live virtual sessions"
  )
  assert.equal(
    canReserveUnderQuota({ usage, alreadyReservedForSession: false }).ok,
    true
  )
})

// 10. Trial purchases remain independent
test("10. Trial purchases remain independent", () => {
  assert.equal(trialGrantsMembershipStatus(), false)
  assert.equal(trialGrantsRecordingsAccess(), false)
  assert.equal(trialGrantsFutureSessions(), false)
  assert.equal(membershipReservationIsStripePurchase(), false)
})

// 11. One-time trial does not consume membership quota
test("11. One-time trial does not consume membership quota", () => {
  assert.equal(trialConsumesMembershipQuota(), false)
  const period = resolveCalendarMonthPeriod(new Date("2026-08-15T12:00:00Z"))
  const used = countQuotaConsumingReservations({
    reservations: [
      {
        status: "confirmed",
        registrationType: "public_trial",
        liveClassStatus: "published",
        liveClassStartsAt: "2026-08-05T15:00:00.000Z",
      },
    ],
    periodStart: period.start,
    periodEnd: period.end,
  })
  assert.equal(used, 0)
})

// 12. Core behavior remains unchanged pending confirmation
test("12. Core behavior remains unchanged pending confirmation", () => {
  const core = virtualLiveSessionQuotaForPlan("plan-1")!
  assert.equal(core.quotaEnforcementActive, false)
  assert.equal(
    shouldEnforceVirtualSessionQuota({
      planSlug: "plan-1",
      accessSource: "personal_stripe",
    }),
    false
  )
  assert.ok(
    defaultCapabilitiesForPlanSlug("plan-1").includes("live_online_sessions")
  )
  const coreCard = ELEVATE_MEMBERSHIPS.find((tier) => tier.slug === "plan-1")!
  assert.ok(coreCard.features.includes("Live online session access"))
})

// 13. Nonprofit behavior remains unchanged pending confirmation
test("13. Nonprofit behavior remains unchanged pending confirmation", () => {
  assert.equal(
    shouldEnforceVirtualSessionQuota({
      planSlug: "plan-2",
      accessSource: "nonprofit_sponsored",
    }),
    false
  )
  assert.equal(
    shouldEnforceVirtualSessionQuota({
      planSlug: "plan-1",
      accessSource: "nonprofit_sponsored",
    }),
    false
  )
  const audience = read(
    "src/features/checkout/utils/membership-audience.ts"
  )
  assert.match(audience, /Weekly live online sessions \(Core-equivalent\)/)
})

// 14. In-person reset period is not invented
test("14. In-person reset period is not invented", () => {
  const platinum = inPersonExperienceConfigForPlan("plan-3")!
  assert.equal(platinum.includedQuantity, 1)
  assert.equal(platinum.resetPeriod, null)
  assert.equal(platinum.quantityEnforcementActive, false)
  assert.equal(inPersonResetPeriodIsConfirmed(platinum), false)
  assert.equal(IN_PERSON_PUBLIC_COPY, "Includes one live in-person experience")
  assert.ok(publicInPersonCopyOmitsUnconfirmedPeriod(IN_PERSON_PUBLIC_COPY))
  for (const phrase of FORBIDDEN_IN_PERSON_PERIOD_PUBLIC_COPY) {
    assert.equal(IN_PERSON_PUBLIC_COPY.toLowerCase().includes(phrase), false)
  }
  const goldCard = ELEVATE_MEMBERSHIPS.find((tier) => tier.slug === "plan-3")!
  assert.ok(goldCard.features.includes(IN_PERSON_PUBLIC_COPY))
  assert.doesNotMatch(goldCard.features.join("\n"), /per month|per year/i)
})

// 15. Existing Stripe prices and subscriptions remain unchanged
test("15. Existing Stripe prices and subscriptions remain unchanged", () => {
  const migration = read(
    "supabase/migrations/20260807010000_virtual_live_session_quota.sql"
  )
  assert.doesNotMatch(migration, /stripe_price|subscriptions|plan_prices/)
  assert.doesNotMatch(migration, /update public\.plan_capabilities|insert into public\.plan_capabilities/i)
  assert.equal(ELEVATE_MEMBERSHIPS[1]?.priceCents, 9900)
  assert.equal(ELEVATE_MEMBERSHIPS[2]?.priceCents, 14900)
})

// 16. Zoom links remain protected
test("16. Zoom links remain protected", () => {
  const service = read(
    "src/features/live-sessions/services/live-sessions.service.ts"
  )
  const controls = read(
    "src/features/dashboard/components/membership-live-session-controls.tsx"
  )
  assert.match(service, /assertQuotaJoinAllowed/)
  assert.match(service, /loadParticipantUrl/)
  assert.doesNotMatch(controls, /zoom_participant_url|zoomHostUrl/)
  assert.match(controls, /issueMemberJoinUrlAction/)
})

// 17. Existing recordings remain accessible according to current rules
test("17. Existing recordings remain accessible according to current rules", () => {
  assert.ok(
    defaultCapabilitiesForPlanSlug("plan-1").includes("session_replays")
  )
  assert.ok(
    defaultCapabilitiesForPlanSlug("plan-2").includes("session_replays")
  )
  assert.ok(
    defaultCapabilitiesForPlanSlug("plan-3").includes("session_replays")
  )
  const gold = ELEVATE_MEMBERSHIPS.find((tier) => tier.slug === "plan-2")!
  assert.ok(gold.features.includes("Recorded session library"))
  assert.ok(gold.features.includes("Up to 2 live virtual classes per month"))
  assert.doesNotMatch(gold.features.join("\n"), /unrestricted|unlimited live/i)
})

// Extra: join requires reservation when enforcement active
test("18. Join requires reservation when Gold quota enforced", () => {
  assert.equal(
    canJoinWithQuotaReservation({
      hasActiveReservation: false,
      enforcementActive: true,
    }).ok,
    false
  )
  assert.equal(
    canJoinWithQuotaReservation({
      hasActiveReservation: true,
      enforcementActive: true,
    }).ok,
    true
  )
  assert.equal(
    canJoinWithQuotaReservation({
      hasActiveReservation: false,
      enforcementActive: false,
    }).ok,
    true
  )
})

// Extra: monthly period semantics documented, not silently billing-period
test("19. Monthly period semantics are explicit calendar_month for Gold", () => {
  assert.equal(
    GOLD_MONTHLY_PERIOD_SEMANTICS_STATUS.implementedEnforcement,
    "calendar_month"
  )
  assert.equal(GOLD_MONTHLY_PERIOD_SEMANTICS_STATUS.clientConfirmationRequired, true)
  assert.equal(
    GOLD_MONTHLY_PERIOD_SEMANTICS_STATUS.billingPeriodAvailableInModel,
    true
  )
  const bounds = resolveQuotaPeriodBounds({
    limitPeriod: "calendar_month",
    currentPeriodStart: "2026-07-20T00:00:00.000Z",
    currentPeriodEnd: "2026-08-20T00:00:00.000Z",
    now: new Date("2026-08-10T12:00:00.000Z"),
  })
  assert.ok(bounds)
  assert.equal(bounds.periodLabel, "month")
  assert.equal(bounds.start.toISOString(), "2026-08-01T00:00:00.000Z")
})
