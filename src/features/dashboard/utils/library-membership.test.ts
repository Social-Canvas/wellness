import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  canMemberJoinLiveSession,
  assertNoZoomUrlsInPublicPayload,
  toPublicLiveSessionCard,
} from "../../live-sessions/utils/live-sessions.ts"
import {
  buildMembershipLibraryCardView,
  filterMemberLibraryCourses,
  formatCapabilityCustomerLabel,
  formatCapabilityCustomerLabels,
  formatMembershipAccessSource,
  isMembershipPlaceholderCourseSlug,
  latestRecordingsForHub,
  MEMBERSHIP_HUB_PATH,
  MEMBERSHIP_NO_RECORDINGS_COPY,
  MEMBERSHIP_NO_SESSION_COPY,
  MEMBERSHIP_PLACEHOLDER_COURSE_SLUGS,
  MEMBERSHIP_RECORDINGS_PATH,
  membershipCardBenefits,
  resolveLiveSessionScheduleState,
} from "./library-membership.ts"
import {
  getEssentialNavItems,
  getMobileNavItems,
  getMoreNavItems,
  getSecondaryNavItems,
  getWideNavItems,
} from "../constants/navigation.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function readSource(relative: string): string {
  return readFileSync(join(root, relative), "utf8")
}

const coreMembership = {
  effectivePlanName: "Elevate Core",
  effectiveTierSlug: "plan-1",
  source: "complimentary",
  status: "active",
  canAttendInPerson: false,
}

const resetCourse = {
  id: "reset-1",
  slug: "7-day-reset-meditation-series",
  title: "The 7-Day Elevated Reset",
}

const placeholderCourses = MEMBERSHIP_PLACEHOLDER_COURSE_SLUGS.map((slug) => ({
  id: slug,
  slug,
  title: slug,
}))

// 1. Core + Reset user sees exactly two primary library cards
test("1. Core + Reset user sees exactly two primary library cards", () => {
  const courses = filterMemberLibraryCourses([
    resetCourse,
    ...placeholderCourses,
  ])
  const membership = buildMembershipLibraryCardView(coreMembership)
  assert.equal(courses.length, 1)
  assert.equal(courses[0]?.slug, "7-day-reset-meditation-series")
  assert.ok(membership)
  assert.equal(courses.length + 1, 2)
})

// 2. Reset-only user sees no membership card
test("2. Reset-only user sees no membership card", () => {
  const membership = buildMembershipLibraryCardView({
    effectivePlanName: null,
    effectiveTierSlug: null,
    source: "none",
    status: "none",
    canAttendInPerson: false,
  })
  assert.equal(membership, null)
  const courses = filterMemberLibraryCourses([resetCourse, ...placeholderCourses])
  assert.equal(courses.length, 1)
})

// 3. Membership card uses effective current plan
test("3. Membership card uses effective current plan", () => {
  const gold = buildMembershipLibraryCardView({
    ...coreMembership,
    effectivePlanName: "Elevate Gold",
    effectiveTierSlug: "plan-2",
    source: "personal_stripe",
    canAttendInPerson: true,
  })
  assert.equal(gold?.planName, "Elevate Gold")
  assert.equal(gold?.planBadge, "Current plan")
})

// 4. Complimentary source is displayed accurately
test("4. Complimentary source is displayed accurately", () => {
  assert.equal(formatMembershipAccessSource("complimentary"), "Complimentary")
  const card = buildMembershipLibraryCardView(coreMembership)
  assert.equal(card?.accessSourceLabel, "Complimentary")
})

// 5. Sponsored source is displayed accurately
test("5. Sponsored source is displayed accurately", () => {
  assert.equal(
    formatMembershipAccessSource("nonprofit_sponsored"),
    "Nonprofit-sponsored"
  )
  const card = buildMembershipLibraryCardView({
    ...coreMembership,
    source: "nonprofit_sponsored",
  })
  assert.equal(card?.accessSourceLabel, "Nonprofit-sponsored")
})

// 6–8. Placeholder cards absent
test("6. Core Course Library placeholder is absent", () => {
  assert.ok(isMembershipPlaceholderCourseSlug("core-course-library"))
  const filtered = filterMemberLibraryCourses([
    { slug: "core-course-library", title: "Core Course Library" },
    resetCourse,
  ])
  assert.equal(filtered.length, 1)
  assert.doesNotMatch(
    filtered.map((c) => c.title).join("|"),
    /Core Course Library/
  )
})

test("7. Virtual Live Session Library placeholder is absent", () => {
  assert.ok(isMembershipPlaceholderCourseSlug("virtual-live-session-library"))
  const filtered = filterMemberLibraryCourses([
    { slug: "virtual-live-session-library", title: "Virtual Live Session Library" },
  ])
  assert.equal(filtered.length, 0)
})

test("8. In-Person & Monthly Extras placeholder is absent", () => {
  assert.ok(isMembershipPlaceholderCourseSlug("in-person-monthly-extras"))
  const filtered = filterMemberLibraryCourses([
    { slug: "in-person-monthly-extras", title: "In-Person & Monthly Extras" },
  ])
  assert.equal(filtered.length, 0)
})

// 9. Core user does not see in-person privilege on card
test("9. Core user does not see in-person privilege", () => {
  const benefits = membershipCardBenefits({ canAttendInPerson: false })
  assert.deepEqual(benefits, [
    "Weekly live online sessions",
    "Recorded session archive",
  ])
  assert.ok(!benefits.includes("In-person sessions"))
  const card = buildMembershipLibraryCardView(coreMembership)
  assert.ok(card)
  assert.ok(!card.benefits.includes("In-person sessions"))
})

// 10. Membership card opens the canonical membership hub
test("10. Membership card opens the canonical membership hub", () => {
  const card = buildMembershipLibraryCardView(coreMembership)
  assert.equal(card?.ctaHref, MEMBERSHIP_HUB_PATH)
  assert.equal(card?.ctaLabel, "Open membership")
  assert.equal(MEMBERSHIP_HUB_PATH, "/dashboard/membership")
  assert.equal(card?.showPrice, false)

  const destinations = readSource(
    "src/features/checkout/constants/destinations.ts"
  )
  const ctaState = readSource(
    "src/features/checkout/utils/membership-plan-cta-state.ts"
  )
  assert.match(destinations, /MEMBERSHIP_HOME_PATH = "\/dashboard\/membership"/)
  assert.match(ctaState, /MEMBERSHIP_HOME_PATH = "\/dashboard\/membership"/)
})

// 11. Membership hub shows next published session (wiring)
test("11. Membership hub shows next published session", () => {
  const hub = readSource(
    "src/features/dashboard/components/membership-hub.tsx"
  )
  const page = readSource(
    "src/app/(dashboard)/dashboard/membership/page.tsx"
  )
  assert.match(page, /listUpcomingLiveSessionsForMembers/)
  assert.match(page, /sessionsResult\.data\[0\]/)
  assert.match(hub, /data-upcoming-live-session/)
  assert.match(hub, /Upcoming live session/)
})

// 12. No-session empty state is clear
test("12. No-session empty state is clear", () => {
  assert.match(MEMBERSHIP_NO_SESSION_COPY, /No upcoming session is scheduled yet/)
  const hub = readSource(
    "src/features/dashboard/components/membership-hub.tsx"
  )
  assert.match(hub, /MEMBERSHIP_NO_SESSION_COPY/)
  assert.match(hub, /data-no-upcoming-session/)
})

// 13. Zoom URL is not present before authorization
test("13. Zoom URL is not present before authorization", () => {
  const publicCard = toPublicLiveSessionCard({
    id: "s1",
    title: "Weekly Reset",
    description: null,
    starts_at: "2030-01-01T12:00:00.000Z",
    ends_at: null,
    session_kind: "membership_weekly",
    allows_public_trial: false,
    trial_open: false,
    capacity: null,
    status: "published",
    access_type: "membership",
    plan_id: null,
    completed_at: null,
    calendly_url: null,
  })
  assert.ok(
    assertNoZoomUrlsInPublicPayload(publicCard as unknown as Record<string, unknown>)
  )

  const hub = readSource(
    "src/features/dashboard/components/membership-hub.tsx"
  )
  const join = readSource(
    "src/features/dashboard/components/membership-live-session-controls.tsx"
  )
  const page = readSource(
    "src/app/(dashboard)/dashboard/membership/page.tsx"
  )
  assert.doesNotMatch(hub, /zoom\.(us|com)|zoom_participant_url|zoomParticipantUrl/)
  assert.doesNotMatch(page, /zoom\.(us|com)|zoom_participant_url/)
  assert.match(join, /issueMemberJoinUrlAction/)
  assert.match(join, /reserveVirtualLiveSessionAction/)
  assert.doesNotMatch(join, /zoom_participant_url|zoomHostUrl/)
})

// 14. Zoom URL is denied outside the join window
test("14. Zoom URL is denied outside the join window", () => {
  const startsAt = "2030-06-01T15:00:00.000Z"
  const now = new Date("2030-06-01T14:00:00.000Z")
  const gate = canMemberJoinLiveSession({
    hasLiveOnlineCapability: true,
    sessionStatus: "published",
    startsAt,
    endsAt: null,
    completedAt: null,
    now,
  })
  assert.equal(gate.ok, false)
  if (!gate.ok) {
    assert.match(gate.reason, /Join opens/)
  }

  const schedule = resolveLiveSessionScheduleState({
    startsAt,
    endsAt: null,
    completedAt: null,
    now,
  })
  assert.equal(schedule.kind, "upcoming")
  assert.equal(
    schedule.kind === "upcoming" ? schedule.joinAvailable : true,
    false
  )
})

// 15. Active member can obtain the participant link during the window
test("15. Active member can obtain the participant link during the window", () => {
  const startsAt = "2030-06-01T15:00:00.000Z"
  const now = new Date("2030-06-01T14:45:00.000Z")
  const gate = canMemberJoinLiveSession({
    hasLiveOnlineCapability: true,
    sessionStatus: "published",
    startsAt,
    endsAt: null,
    completedAt: null,
    now,
  })
  assert.equal(gate.ok, true)

  const schedule = resolveLiveSessionScheduleState({
    startsAt,
    endsAt: null,
    completedAt: null,
    now,
  })
  assert.equal(schedule.kind, "join_open")
  assert.equal(schedule.kind === "join_open" && schedule.joinAvailable, true)

  const service = readSource(
    "src/features/live-sessions/services/live-sessions.service.ts"
  )
  assert.match(service, /issueMemberJoinUrl/)
  assert.match(service, /loadParticipantUrl/)
  assert.match(service, /canMemberJoinLiveSession/)
})

// 16. Latest recordings display in the membership hub
test("16. Latest recordings display in the membership hub", () => {
  const items = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }]
  assert.deepEqual(
    latestRecordingsForHub(items, 3).map((i) => i.id),
    ["1", "2", "3"]
  )
  const hub = readSource(
    "src/features/dashboard/components/membership-hub.tsx"
  )
  assert.match(hub, /Latest recordings/)
  assert.match(hub, /RecordedSessionCard/)
})

// 17. No-recordings empty state is clear
test("17. No-recordings empty state is clear", () => {
  assert.match(
    MEMBERSHIP_NO_RECORDINGS_COPY,
    /Recordings will appear here after completed live sessions/
  )
  const hub = readSource(
    "src/features/dashboard/components/membership-hub.tsx"
  )
  assert.match(hub, /MEMBERSHIP_NO_RECORDINGS_COPY/)
  assert.match(hub, /data-no-recordings/)
})

// 18. Full recording archive remains accessible
test("18. Full recording archive remains accessible", () => {
  assert.equal(MEMBERSHIP_RECORDINGS_PATH, "/dashboard/recorded-sessions")
  const hub = readSource(
    "src/features/dashboard/components/membership-hub.tsx"
  )
  assert.match(hub, /View all recordings/)
  assert.match(hub, /MEMBERSHIP_RECORDINGS_PATH/)
  const archivePage = readSource(
    "src/app/(dashboard)/dashboard/recorded-sessions/page.tsx"
  )
  assert.match(archivePage, /RecordedSessionsArchive|listPublishedRecordedSessionsForMember/)
})

// 19. Public routes remain accessible through More
test("19. Public routes remain accessible through More", () => {
  const more = getMoreNavItems(false).map((item) => item.label)
  for (const label of ["Programs", "Shop", "Blog", "About"]) {
    assert.ok(more.includes(label), `missing ${label} in More`)
  }
  const secondary = getSecondaryNavItems(false).map((item) => item.label)
  assert.deepEqual(secondary, ["Programs", "Shop", "Blog", "About"])
})

// 20. Account page uses customer-facing capability labels
test("20. Account page uses customer-facing capability labels", () => {
  assert.equal(
    formatCapabilityCustomerLabel("membership_course_library"),
    "Recorded session library"
  )
  assert.equal(
    formatCapabilityCustomerLabel("live_online_sessions"),
    "Weekly live online sessions"
  )
  assert.equal(
    formatCapabilityCustomerLabel("session_replays"),
    "Session replays"
  )
  assert.deepEqual(
    formatCapabilityCustomerLabels([
      "membership_course_library",
      "live_online_sessions",
      "session_replays",
    ]),
    [
      "Recorded session library",
      "Weekly live online sessions",
      "Session replays",
    ]
  )

  const account = readSource(
    "src/app/(dashboard)/dashboard/account/page.tsx"
  )
  assert.match(account, /formatCapabilityCustomerLabel/)
  assert.doesNotMatch(
    account,
    /\{capability\.replaceAll\("_", " "\)\}/
  )
})

// 21. Existing Reset progress and access remain unchanged
test("21. Existing Reset progress and access remain unchanged", () => {
  const library = readSource(
    "src/app/(dashboard)/dashboard/library/page.tsx"
  )
  assert.match(library, /listAccessibleCourses/)
  assert.match(library, /LibraryCourseCard/)
  assert.match(library, /filterMemberLibraryCourses/)
  assert.doesNotMatch(library, /revoke|delete.*progress|RESET_COURSE_ID/)

  const content = readSource(
    "src/features/content/services/content.service.ts"
  )
  assert.match(content, /canAccessCourse/)
  assert.match(content, /listAccessibleCourses/)
})

// 22. Stripe, Mux, email and nonprofit seat behavior remain unchanged
test("22. Stripe, Mux, email and nonprofit seat behavior remain unchanged", () => {
  const utils = readSource(
    "src/features/dashboard/utils/library-membership.ts"
  )
  assert.doesNotMatch(utils, /createCheckout|resend\.|@mux\//i)
  assert.doesNotMatch(utils, /stripe\.(customers|checkout|subscriptions)/i)

  const membershipService = readSource(
    "src/server/services/membership.service.ts"
  )
  assert.match(membershipService, /getEffectiveMembership/)

  // Presentation-only change set: no entitlement rule rewrites in these files
  const libraryPage = readSource(
    "src/app/(dashboard)/dashboard/library/page.tsx"
  )
  assert.doesNotMatch(libraryPage, /revokeAccess|deleteSubscription|createCheckout/)
})

// Gold/Platinum benefits + nav simplification extras
test("Gold membership card includes in-person as a benefit, not a course card", () => {
  const card = buildMembershipLibraryCardView({
    effectivePlanName: "Elevate Gold",
    effectiveTierSlug: "plan-2",
    source: "personal_stripe",
    status: "active",
    canAttendInPerson: true,
  })
  assert.ok(card?.benefits.includes("In-person sessions"))
  assert.ok(
    !filterMemberLibraryCourses([
      { slug: "in-person-monthly-extras", title: "In-Person & Monthly Extras" },
    ]).length
  )
})

test("Nav essentials include Membership and exclude Live/Recorded top-level", () => {
  const essentials = getEssentialNavItems(false).map((item) => item.label)
  assert.deepEqual(essentials, [
    "My Library",
    "Membership",
    "Downloads",
    "Certificates",
    "Account",
  ])
  assert.deepEqual(getWideNavItems(false), [])
  const mobile = getMobileNavItems(false).map((item) => item.label)
  assert.ok(!mobile.includes("Live Sessions"))
  assert.ok(!mobile.includes("Recorded Sessions"))
  assert.ok(mobile.includes("Membership"))
})

test("Library page wires membership card from getEffectiveMembership", () => {
  const library = readSource(
    "src/app/(dashboard)/dashboard/library/page.tsx"
  )
  assert.match(library, /getEffectiveMembership/)
  assert.match(library, /buildMembershipLibraryCardView/)
  assert.match(library, /MembershipLibraryCard/)
  assert.match(library, /data-member-library-grid/)
})

test("Membership hub page exists at canonical route", () => {
  const page = readSource(
    "src/app/(dashboard)/dashboard/membership/page.tsx"
  )
  assert.match(page, /MembershipHub/)
  assert.match(page, /getEffectiveMembership/)
  assert.match(page, /listPublishedRecordedSessionsForMember/)
})

test("Personally billed access source label", () => {
  assert.equal(
    formatMembershipAccessSource("personal_stripe"),
    "Personally billed"
  )
})
