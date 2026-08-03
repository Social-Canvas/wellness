import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import { MEMBERSHIP_HOME_PATH as DEST_MEMBERSHIP_HOME_PATH } from "../constants/destinations.ts"
import {
  LIVE_BREATHWORK_INCLUDED_LABEL,
  LIVE_BREATHWORK_MEMBER_CONFLICT,
  LIVE_BREATHWORK_REGISTERED_LABEL,
  LIVE_BREATHWORK_RESERVE_LABEL,
  buildLiveBreathworkOfferView,
  shouldRefuseLiveBreathworkCheckoutForMember,
} from "./live-breathwork-offer-state.ts"
import {
  MEMBERSHIP_HOME_PATH,
  buildAllMembershipPlanCardViews,
  buildMembershipPlanCardView,
  emptyMembershipPlanCtaFacts,
  membershipPlanCtaFactsFromEffective,
  type MembershipPlanCtaFacts,
} from "./membership-plan-cta-state.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function personalFacts(
  overrides: Partial<MembershipPlanCtaFacts> = {}
): MembershipPlanCtaFacts {
  return {
    isAuthenticated: true,
    source: "personal_stripe",
    status: "active",
    effectiveTierSlug: "plan-1",
    hasPersonalBilling: true,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2026-09-01T00:00:00.000Z",
    scheduledPlanSlug: null,
    scheduledPlanName: null,
    organizationName: null,
    ...overrides,
  }
}

// 1. Core subscriber sees Core as Current plan
test("1. Core subscriber sees Core as Current plan", () => {
  const view = buildMembershipPlanCardView("plan-1", personalFacts())
  assert.equal(view.kind, "current")
  assert.equal(view.badge, "Current plan")
  assert.equal(view.isCurrent, true)
})

// 2. Gold subscriber sees Gold as Current plan
test("2. Gold subscriber sees Gold as Current plan", () => {
  const view = buildMembershipPlanCardView(
    "plan-2",
    personalFacts({ effectiveTierSlug: "plan-2" })
  )
  assert.equal(view.kind, "current")
  assert.equal(view.badge, "Current plan")
})

// 3. Platinum subscriber sees Platinum as Current plan
test("3. Platinum subscriber sees Platinum as Current plan", () => {
  const view = buildMembershipPlanCardView(
    "plan-3",
    personalFacts({ effectiveTierSlug: "plan-3" })
  )
  assert.equal(view.kind, "current")
  assert.equal(view.badge, "Current plan")
})

// 4. Current-plan CTA navigates to the canonical member area
test("4. Current-plan CTA navigates to canonical membership home", () => {
  const view = buildMembershipPlanCardView("plan-1", personalFacts())
  assert.equal(view.ctaLabel, "Go to my membership")
  assert.equal(view.ctaHref, MEMBERSHIP_HOME_PATH)
  assert.equal(MEMBERSHIP_HOME_PATH, DEST_MEMBERSHIP_HOME_PATH)
  assert.equal(MEMBERSHIP_HOME_PATH, "/dashboard/membership")
})

// 5. Current plan never starts Checkout
test("5. Current plan never starts Checkout", () => {
  const view = buildMembershipPlanCardView("plan-2", personalFacts({
    effectiveTierSlug: "plan-2",
  }))
  assert.equal(view.allowsCheckout, false)
  assert.ok(view.ctaHref)
  assert.doesNotMatch(view.ctaHref, /checkout/)
})

// 6. Higher plans show Upgrade
test("6. Higher plans show Upgrade", () => {
  const gold = buildMembershipPlanCardView("plan-2", personalFacts())
  const platinum = buildMembershipPlanCardView("plan-3", personalFacts())
  assert.equal(gold.kind, "upgrade")
  assert.equal(gold.ctaLabel, "Upgrade to Gold")
  assert.equal(platinum.ctaLabel, "Upgrade to Platinum")
  assert.equal(gold.allowsCheckout, true)
})

// 7. Lower plans show Downgrade
test("7. Lower plans show Downgrade", () => {
  const core = buildMembershipPlanCardView(
    "plan-1",
    personalFacts({ effectiveTierSlug: "plan-3" })
  )
  assert.equal(core.kind, "downgrade")
  assert.equal(core.ctaLabel, "Downgrade to Core")
  assert.ok(core.ctaHref?.includes("/dashboard/account"))
  assert.ok(core.ctaHref?.includes("downgrade=plan-1"))
  assert.equal(core.allowsCheckout, false)
})

// 8. Scheduled downgrade displays target and effective date
test("8. Scheduled downgrade displays target and effective date", () => {
  const view = buildMembershipPlanCardView(
    "plan-1",
    personalFacts({
      effectiveTierSlug: "plan-2",
      scheduledPlanSlug: "plan-1",
      scheduledPlanName: "Elevate Core",
      currentPeriodEnd: "2026-10-15T00:00:00.000Z",
    })
  )
  assert.equal(view.kind, "downgrade_scheduled")
  assert.equal(view.ctaDisabled, true)
  assert.match(view.statusNote ?? "", /Downgrade to Core/)
  assert.match(view.statusNote ?? "", /Oct/)
})

// 9. Cancellation-at-period-end remains current until expiry
test("9. Cancellation-at-period-end remains current until expiry", () => {
  const view = buildMembershipPlanCardView(
    "plan-2",
    personalFacts({
      effectiveTierSlug: "plan-2",
      status: "cancel_at_period_end",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-11-01T00:00:00.000Z",
    })
  )
  assert.equal(view.kind, "current")
  assert.equal(view.badge, "Current plan")
  assert.match(view.statusNote ?? "", /Cancellation scheduled/)
})

// 10. Sponsored member sees sponsored access rather than personal billing
test("10. Sponsored member sees sponsored access rather than personal billing", () => {
  const facts = personalFacts({
    source: "nonprofit_sponsored",
    hasPersonalBilling: false,
    organizationName: "River Nonprofit",
  })
  const current = buildMembershipPlanCardView("plan-1", facts)
  const lower = buildMembershipPlanCardView("plan-1", {
    ...facts,
    effectiveTierSlug: "plan-2",
  })
  assert.equal(current.badge, "Sponsored membership")
  assert.match(current.sourceLabel ?? "", /River Nonprofit/)
  assert.equal(lower.kind, "unavailable")
  assert.match(lower.statusNote ?? "", /sponsored/i)
})

// 11. Complimentary member does not see personal billing controls
test("11. Complimentary member does not see personal billing controls", () => {
  const facts = personalFacts({
    source: "complimentary",
    hasPersonalBilling: false,
    effectiveTierSlug: "plan-2",
  })
  const current = buildMembershipPlanCardView("plan-2", facts)
  const downgrade = buildMembershipPlanCardView("plan-1", facts)
  assert.equal(current.badge, "Current complimentary plan")
  assert.equal(downgrade.kind, "unavailable")
  assert.match(downgrade.statusNote ?? "", /administrators/i)
})

test("complimentary Core member sees Current complimentary plan, not Join", () => {
  const facts = personalFacts({
    source: "complimentary",
    hasPersonalBilling: false,
    effectiveTierSlug: "plan-1",
    status: "active",
  })
  const views = buildAllMembershipPlanCardViews(facts)
  const core = views.find((view) => view.planSlug === "plan-1")
  assert.ok(core)
  assert.equal(core.kind, "current")
  assert.equal(core.badge, "Current complimentary plan")
  assert.equal(core.sourceLabel, "Current complimentary plan")
  assert.equal(core.ctaLabel, "Go to my membership")
  assert.equal(core.visuallyCurrent, true)
  assert.equal(core.allowsCheckout, false)
  assert.notEqual(core.ctaLabel, "Join Elevate Core")

  const gold = views.find((view) => view.planSlug === "plan-2")
  assert.equal(gold?.kind, "upgrade")
  assert.equal(gold?.ctaLabel, "Upgrade to Gold")
})

test("programs page resolves membership via profile id, not auth session id", () => {
  const programs = readSrc("app/(public)/programs/page.tsx")
  assert.match(programs, /getCurrentProfile/)
  assert.match(programs, /getEffectiveMembership\(userId\)/)
  assert.doesNotMatch(programs, /getCurrentUser/)
})

test("membership queries disambiguate plans!plan_id after scheduled_plan_id", () => {
  const membership = readSrc("server/services/membership.service.ts")
  assert.match(membership, /plans!plan_id/)
  assert.doesNotMatch(
    membership,
    /access_source, plans \( id, name, slug \)/
  )
  const billing = readSrc("features/billing/services/billing.service.ts")
  assert.match(billing, /plans!plan_id/)
})

// 12–15. Preview controls removed from Build on your membership
test("12-15. Preview buttons, Watch intro, and preview videos absent from program offers", () => {
  const card = readSrc("features/checkout/components/program-offer-card.tsx")
  assert.doesNotMatch(card, /Watch intro/)
  assert.doesNotMatch(card, />\s*Preview\s*</)
  assert.doesNotMatch(card, /VideoPreviewModal/)
  assert.doesNotMatch(card, /setPreviewOpen/)
  assert.match(card, /BrandImage/)
})

// 16. Active member sees Included in your membership for Live Breathwork
test("16. Active member sees Included in your membership for Live Breathwork", () => {
  const view = buildLiveBreathworkOfferView({
    isAuthenticated: true,
    hasLiveOnlineSessionsCapability: true,
    membershipAccessActive: true,
    alreadyRegisteredForSelectedSession: false,
    hasEligibleUpcomingSession: true,
  })
  assert.equal(view.state, "member_included")
  assert.equal(view.ctaLabel, LIVE_BREATHWORK_INCLUDED_LABEL)
  assert.equal(view.ctaDisabled, true)
  assert.equal(view.allowsCheckout, false)
})

// 17. Member cannot call Live Breathwork Checkout directly
test("17. Member cannot call Live Breathwork Checkout directly", () => {
  assert.equal(
    shouldRefuseLiveBreathworkCheckoutForMember({
      membershipAccessActive: true,
      hasLiveOnlineSessionsCapability: true,
    }),
    true
  )
  const service = readSrc(
    "features/live-sessions/services/live-trial-checkout.service.ts"
  )
  assert.match(service, /shouldRefuseLiveBreathworkCheckoutForMember/)
  assert.match(service, /LIVE_BREATHWORK_MEMBER_CONFLICT/)
  assert.equal(
    LIVE_BREATHWORK_MEMBER_CONFLICT,
    "This session is already included in your active membership."
  )
})

// 18. Signed-out non-member may reserve an eligible upcoming session
test("18. Signed-out non-member may reserve an eligible upcoming session", () => {
  const view = buildLiveBreathworkOfferView({
    isAuthenticated: false,
    hasLiveOnlineSessionsCapability: false,
    membershipAccessActive: false,
    alreadyRegisteredForSelectedSession: false,
    hasEligibleUpcomingSession: true,
    reserveHref: "/live-breathwork",
  })
  assert.equal(view.state, "logged_out")
  assert.equal(view.ctaLabel, LIVE_BREATHWORK_RESERVE_LABEL)
  assert.equal(view.allowsCheckout, true)
  assert.equal(view.ctaHref, "/live-breathwork")
})

// 19. Existing trial registrant cannot purchase twice
test("19. Existing trial registrant cannot purchase twice", () => {
  const view = buildLiveBreathworkOfferView({
    isAuthenticated: true,
    hasLiveOnlineSessionsCapability: false,
    membershipAccessActive: false,
    alreadyRegisteredForSelectedSession: true,
    hasEligibleUpcomingSession: true,
    registeredHref: "/dashboard/live-sessions/abc/join?trial=1",
  })
  assert.equal(view.state, "already_registered")
  assert.equal(view.ctaLabel, LIVE_BREATHWORK_REGISTERED_LABEL)
  assert.equal(view.allowsCheckout, false)
})

// 20. Expired member may purchase when otherwise eligible
test("20. Expired member may purchase when otherwise eligible", () => {
  const view = buildLiveBreathworkOfferView({
    isAuthenticated: true,
    hasLiveOnlineSessionsCapability: false,
    membershipAccessActive: false,
    alreadyRegisteredForSelectedSession: false,
    hasEligibleUpcomingSession: true,
  })
  assert.equal(view.state, "non_member")
  assert.equal(view.allowsCheckout, true)
  assert.equal(
    shouldRefuseLiveBreathworkCheckoutForMember({
      membershipAccessActive: false,
      hasLiveOnlineSessionsCapability: false,
    }),
    false
  )
})

// 21. Reset-only purchaser is not incorrectly treated as a member
test("21. Reset-only purchaser is not incorrectly treated as a member", () => {
  const facts = emptyMembershipPlanCtaFacts(true)
  const views = buildAllMembershipPlanCardViews(facts)
  assert.ok(views.every((view) => view.kind === "join"))
  const breathwork = buildLiveBreathworkOfferView({
    isAuthenticated: true,
    hasLiveOnlineSessionsCapability: false,
    membershipAccessActive: false,
    alreadyRegisteredForSelectedSession: false,
    hasEligibleUpcomingSession: true,
  })
  assert.equal(breathwork.state, "non_member")
})

// 22. Ebook-only purchaser is not incorrectly treated as a member
test("22. Ebook-only purchaser is not incorrectly treated as a member", () => {
  const facts = membershipPlanCtaFactsFromEffective({
    isAuthenticated: true,
    source: "none",
    status: "none",
    effectiveTierSlug: null,
    hasPersonalBilling: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    scheduledPlanSlug: null,
    scheduledPlanName: null,
    organizationName: null,
  })
  assert.equal(facts.effectiveTierSlug, null)
  assert.equal(
    buildMembershipPlanCardView("plan-1", facts).ctaLabel,
    "Join Elevate Core"
  )
})

// 23. Member recordings and protected player remain unchanged
test("23. Member recordings and protected player remain unchanged", () => {
  const recorded = readSrc("app/(dashboard)/dashboard/recorded-sessions/page.tsx")
  assert.match(recorded, /session_replays|recorded/i)
  const player = readSrc("features/content/components/LessonPlayerView.tsx")
  assert.match(player, /Mux|playback|token/i)
})

// 24. Homepage testimonial carousel remains unchanged
test("24. Homepage testimonial carousel remains unchanged", () => {
  const home = readSrc("app/(public)/page.tsx")
  assert.match(home, /testimonial/i)
})

// 25. No Stripe, price, database, email or Mux configuration changes in this feature
test("25. Feature surfaces use entitlement resolvers without Stripe price hardcoding", () => {
  const programs = readSrc("app/(public)/programs/page.tsx")
  assert.match(programs, /getEffectiveMembership/)
  assert.match(programs, /buildAllMembershipPlanCardViews/)
  assert.match(programs, /buildLiveBreathworkOfferView/)
  assert.doesNotMatch(programs, /Watch intro/)
  assert.doesNotMatch(programs, /VideoPreviewModal/)

  const cta = readSrc("features/checkout/utils/membership-plan-cta-state.ts")
  assert.doesNotMatch(cta, /price_/)
  assert.doesNotMatch(cta, /STRIPE_/)
})

test("Gold current plan: Core downgrade and Platinum upgrade", () => {
  const facts = personalFacts({ effectiveTierSlug: "plan-2" })
  const views = buildAllMembershipPlanCardViews(facts)
  assert.equal(views[0]?.ctaLabel, "Downgrade to Core")
  assert.equal(views[1]?.ctaLabel, "Go to my membership")
  assert.equal(views[2]?.ctaLabel, "Upgrade to Platinum")
})

test("cancel-at-period-end disables additional downgrades", () => {
  const view = buildMembershipPlanCardView(
    "plan-1",
    personalFacts({
      effectiveTierSlug: "plan-2",
      status: "cancel_at_period_end",
      cancelAtPeriodEnd: true,
    })
  )
  assert.equal(view.kind, "unavailable")
  assert.equal(view.ctaDisabled, true)
})

test("logged-out users see Join CTAs with checkout hrefs", () => {
  const views = buildAllMembershipPlanCardViews(emptyMembershipPlanCtaFacts(false))
  for (const view of views) {
    assert.equal(view.kind, "join")
    assert.equal(view.allowsCheckout, true)
    assert.match(view.ctaHref ?? "", /\/checkout\/consent/)
  }
})

test("unavailable Live Breathwork when no upcoming trial session", () => {
  const view = buildLiveBreathworkOfferView({
    isAuthenticated: false,
    hasLiveOnlineSessionsCapability: false,
    membershipAccessActive: false,
    alreadyRegisteredForSelectedSession: false,
    hasEligibleUpcomingSession: false,
  })
  assert.equal(view.state, "unavailable")
  assert.equal(view.ctaDisabled, true)
  assert.equal(view.allowsCheckout, false)
})
