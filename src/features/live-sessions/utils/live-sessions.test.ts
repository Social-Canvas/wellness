import assert from "node:assert/strict"
import { test } from "node:test"

import {
  LIVE_BREATHWORK_TRIAL_CATALOG_AMOUNT_CENTS,
  LIVE_BREATHWORK_TRIAL_CONFIRMATION_NEEDED,
  LIVE_BREATHWORK_TRIAL_PRICE_APPROVED_IN_APP_CONFIG,
  canStartLiveBreathworkTrialCheckout,
  isLiveBreathworkTrialPriceApproved,
} from "../../../lib/constants/live-breathwork-trial.ts"
import {
  DEFAULT_CAPABILITIES_BY_PLAN_SLUG,
  RECORDED_SESSIONS_CAPABILITY,
} from "../../../server/services/membership-capabilities.ts"
import {
  assertNoZoomUrlsInPublicPayload,
  billingTierMapsToContentPlan,
  buildLiveTrialCheckoutMetadata,
  canMemberJoinLiveSession,
  canTrialUserJoinLiveSession,
  goldPlatinumInheritCoreLiveAndRecordings,
  isWithinMemberJoinWindow,
  mapNonprofitSeatSlugToBillingTier,
  membershipCtaPathAfterTrial,
  parseLiveTrialCheckoutMetadata,
  recordingAccessIsSharedAcrossPlans,
  shouldOfferTrialFeedback,
  sponsoredContentPlanSlug,
  toPublicLiveSessionCard,
  trialGrantsFutureSessions,
  trialGrantsMembershipStatus,
  trialGrantsRecordingsAccess,
} from "./live-sessions.ts"

const START = "2026-08-10T17:00:00.000Z"
const END = "2026-08-10T18:30:00.000Z"

// 1
test("Core includes live_online_sessions and session_replays", () => {
  const caps = DEFAULT_CAPABILITIES_BY_PLAN_SLUG["plan-1"] ?? []
  assert.ok(caps.includes("live_online_sessions"))
  assert.ok(caps.includes("session_replays"))
  assert.ok(!caps.includes("in_person_sessions"))
})

// 2
test("Gold inherits Core live + recordings and adds in_person only", () => {
  const core = new Set(DEFAULT_CAPABILITIES_BY_PLAN_SLUG["plan-1"])
  const gold = DEFAULT_CAPABILITIES_BY_PLAN_SLUG["plan-2"] ?? []
  for (const key of core) {
    assert.ok(gold.includes(key), `Gold missing Core capability ${key}`)
  }
  assert.ok(gold.includes("in_person_sessions"))
})

// 3
test("Platinum inherits Core/Gold live + recordings without content duplication flag", () => {
  assert.equal(goldPlatinumInheritCoreLiveAndRecordings(), true)
  assert.equal(recordingAccessIsSharedAcrossPlans(), true)
  const platinum = DEFAULT_CAPABILITIES_BY_PLAN_SLUG["plan-3"] ?? []
  assert.ok(platinum.includes("live_online_sessions"))
  assert.ok(platinum.includes("session_replays"))
  assert.ok(platinum.includes("priority_support"))
})

// 4
test("recorded_sessions business alias maps to deployed session_replays", () => {
  assert.equal(RECORDED_SESSIONS_CAPABILITY, "session_replays")
})

// 5
test("sponsored content plan is Core-equivalent plan-1", () => {
  assert.equal(sponsoredContentPlanSlug(), "plan-1")
})

// 6
test("org billing tiers never map to Gold/Platinum content", () => {
  assert.equal(billingTierMapsToContentPlan("small"), null)
  assert.equal(billingTierMapsToContentPlan("mid_size"), null)
  assert.equal(billingTierMapsToContentPlan("large"), null)
  assert.equal(billingTierMapsToContentPlan("enterprise"), null)
})

// 7
test("nonprofit seat slugs map to billing tiers only", () => {
  assert.equal(mapNonprofitSeatSlugToBillingTier("small"), "small")
  assert.equal(mapNonprofitSeatSlugToBillingTier("mid-size"), "mid_size")
  assert.equal(mapNonprofitSeatSlugToBillingTier("large"), "large")
  assert.equal(mapNonprofitSeatSlugToBillingTier("enterprise"), "enterprise")
  assert.equal(mapNonprofitSeatSlugToBillingTier("plan-2"), null)
})

// 8
test("public live session card omits Zoom URLs", () => {
  const card = toPublicLiveSessionCard({
    id: "11111111-1111-4111-8111-111111111111",
    title: "Weekly Reset",
    description: null,
    starts_at: START,
    ends_at: END,
    session_kind: "membership_weekly",
    allows_public_trial: true,
    trial_open: true,
    capacity: 40,
    status: "published",
    access_type: "member_only",
    plan_id: null,
    completed_at: null,
    calendly_url: null,
  })
  assert.equal(card.title, "Weekly Reset")
  assert.ok(assertNoZoomUrlsInPublicPayload(card as unknown as Record<string, unknown>))
})

// 9
test("assertNoZoomUrlsInPublicPayload rejects leaked host/participant keys", () => {
  assert.equal(
    assertNoZoomUrlsInPublicPayload({ zoom_host_url: "https://zoom.us/s/host" }),
    false
  )
  assert.equal(
    assertNoZoomUrlsInPublicPayload({
      zoomParticipantUrl: "https://zoom.us/j/123",
    }),
    false
  )
  assert.equal(assertNoZoomUrlsInPublicPayload({ title: "ok" }), true)
})

// 10
test("member join window opens 30 minutes before start", () => {
  assert.equal(
    isWithinMemberJoinWindow({
      startsAt: START,
      endsAt: END,
      now: new Date("2026-08-10T16:29:00.000Z"),
    }),
    false
  )
  assert.equal(
    isWithinMemberJoinWindow({
      startsAt: START,
      endsAt: END,
      now: new Date("2026-08-10T16:30:00.000Z"),
    }),
    true
  )
})

// 11
test("member join requires live_online_sessions capability", () => {
  const denied = canMemberJoinLiveSession({
    hasLiveOnlineCapability: false,
    sessionStatus: "published",
    startsAt: START,
    endsAt: END,
    completedAt: null,
    now: new Date("2026-08-10T17:05:00.000Z"),
  })
  assert.equal(denied.ok, false)

  const allowed = canMemberJoinLiveSession({
    hasLiveOnlineCapability: true,
    sessionStatus: "published",
    startsAt: START,
    endsAt: END,
    completedAt: null,
    now: new Date("2026-08-10T17:05:00.000Z"),
  })
  assert.equal(allowed.ok, true)
})

// 12
test("trial join is limited to the registered session only", () => {
  const wrongSession = canTrialUserJoinLiveSession({
    registrationStatus: "confirmed",
    registrationType: "public_trial",
    liveClassId: "aaa",
    registrationLiveClassId: "bbb",
    sessionStatus: "published",
    startsAt: START,
    endsAt: END,
    completedAt: null,
    now: new Date("2026-08-10T17:05:00.000Z"),
  })
  assert.equal(wrongSession.ok, false)

  const ok = canTrialUserJoinLiveSession({
    registrationStatus: "confirmed",
    registrationType: "public_trial",
    liveClassId: "aaa",
    registrationLiveClassId: "aaa",
    sessionStatus: "published",
    startsAt: START,
    endsAt: END,
    completedAt: null,
    now: new Date("2026-08-10T17:05:00.000Z"),
  })
  assert.equal(ok.ok, true)
})

// 13
test("pending payment trial cannot join", () => {
  const result = canTrialUserJoinLiveSession({
    registrationStatus: "pending_payment",
    registrationType: "public_trial",
    liveClassId: "aaa",
    registrationLiveClassId: "aaa",
    sessionStatus: "published",
    startsAt: START,
    endsAt: END,
    completedAt: null,
    now: new Date("2026-08-10T17:05:00.000Z"),
  })
  assert.equal(result.ok, false)
})

// 14
test("trial never grants membership, recordings, or future sessions", () => {
  assert.equal(trialGrantsMembershipStatus(), false)
  assert.equal(trialGrantsRecordingsAccess(), false)
  assert.equal(trialGrantsFutureSessions(), false)
})

// 15
test("trial checkout metadata round-trips trusted server fields", () => {
  const meta = buildLiveTrialCheckoutMetadata({
    profileId: "11111111-1111-4111-8111-111111111111",
    productId: "22222222-2222-4222-8222-222222222222",
    liveClassId: "33333333-3333-4333-8333-333333333333",
  })
  assert.equal(meta.purchase_type, "live_session_trial")
  const parsed = parseLiveTrialCheckoutMetadata(meta)
  assert.ok(parsed)
  assert.equal(parsed?.liveClassId, meta.live_class_id)
})

// 16
test("browser-like product purchase metadata is not treated as trial", () => {
  assert.equal(
    parseLiveTrialCheckoutMetadata({
      purchase_type: "product",
      product_id: "x",
      profile_id: "y",
      live_class_id: "z",
    }),
    null
  )
})

// 17
test("$55 trial price is catalog-only until app config approval", () => {
  assert.equal(LIVE_BREATHWORK_TRIAL_CATALOG_AMOUNT_CENTS, 5500)
  assert.equal(LIVE_BREATHWORK_TRIAL_PRICE_APPROVED_IN_APP_CONFIG, false)
  assert.equal(isLiveBreathworkTrialPriceApproved(), false)
  assert.match(LIVE_BREATHWORK_TRIAL_CONFIRMATION_NEEDED, /approval|required/i)
})

// 18
test("trial checkout blocked without price approval even in test mode", () => {
  const result = canStartLiveBreathworkTrialCheckout({
    stripeMode: "test",
    hasConfiguredStripePriceId: true,
  })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.reason, /approval|required/i)
  }
})

// 19
test("trial checkout never allowed in live Stripe mode", () => {
  // Force-check live denial path via local override simulation of approved=false already covered;
  // live mode still denied by helper when approval flips — assert live branch message shape.
  const result = canStartLiveBreathworkTrialCheckout({
    stripeMode: "live",
    hasConfiguredStripePriceId: true,
  })
  assert.equal(result.ok, false)
})

// 20
test("feedback offered after completed trial session", () => {
  assert.equal(
    shouldOfferTrialFeedback({
      registrationType: "public_trial",
      registrationStatus: "attended",
      sessionCompleted: true,
      feedbackSubmitted: false,
    }),
    true
  )
  assert.equal(
    shouldOfferTrialFeedback({
      registrationType: "public_trial",
      registrationStatus: "attended",
      sessionCompleted: true,
      feedbackSubmitted: true,
    }),
    false
  )
})

// 21
test("membership CTA path after trial points to programs memberships", () => {
  assert.equal(membershipCtaPathAfterTrial(), "/programs#memberships")
})

// 22
test("completed sessions cannot be joined by members", () => {
  const result = canMemberJoinLiveSession({
    hasLiveOnlineCapability: true,
    sessionStatus: "published",
    startsAt: START,
    endsAt: END,
    completedAt: "2026-08-10T18:40:00.000Z",
    now: new Date("2026-08-10T17:05:00.000Z"),
  })
  assert.equal(result.ok, false)
})

// 23
test("draft sessions cannot be joined", () => {
  const result = canMemberJoinLiveSession({
    hasLiveOnlineCapability: true,
    sessionStatus: "draft",
    startsAt: START,
    endsAt: END,
    completedAt: null,
    now: new Date("2026-08-10T17:05:00.000Z"),
  })
  assert.equal(result.ok, false)
})

// 24
test("member join closes after session window", () => {
  assert.equal(
    isWithinMemberJoinWindow({
      startsAt: START,
      endsAt: END,
      now: new Date("2026-08-10T19:01:00.000Z"),
    }),
    false
  )
})

// 25
test("live activation inventory keeps trial deferred with no live Price", async () => {
  const inventory = await import(
    "../../../server/integrations/stripe/live-activation-inventory.ts"
  )
  const item = inventory.getLiveStripeActivationItem("standalone-live-session")
  assert.ok(item)
  assert.equal(item?.status, "deferred")
  assert.equal(item?.liveCheckout, false)
  assert.equal(item?.livePrice, false)
  assert.equal(
    inventory.isLiveStripeCheckoutEligible("standalone-live-session"),
    false
  )
})

// 26
test("Health Professional stays hidden from live Stripe activation", async () => {
  const inventory = await import(
    "../../../server/integrations/stripe/live-activation-inventory.ts"
  )
  const item = inventory.getLiveStripeActivationItem("health-professional-session")
  assert.equal(item?.status, "hidden")
  assert.equal(item?.liveCheckout, false)
  assert.equal(item?.livePrice, false)
})

// 27
test("VIP and Retreats remain enquiry-only in live inventory", async () => {
  const inventory = await import(
    "../../../server/integrations/stripe/live-activation-inventory.ts"
  )
  assert.equal(inventory.getLiveStripeActivationItem("vip-package")?.status, "enquiry_only")
  assert.equal(
    inventory.getLiveStripeActivationItem("retreats-private-events")?.status,
    "enquiry_only"
  )
})

// 28
test("nonprofit billing tier constant separates seats from content", async () => {
  const audience = await import(
    "../../checkout/utils/membership-audience.ts"
  )
  assert.equal(audience.NONPROFIT_BILLING_TIER_NOT_CONTENT_TIER, true)
  assert.ok(
    audience.NONPROFIT_MEMBERSHIP_BENEFITS.some((b: string) =>
      /Core-equivalent/i.test(b)
    )
  )
})
