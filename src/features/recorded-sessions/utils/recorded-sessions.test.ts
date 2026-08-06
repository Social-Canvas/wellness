import assert from "node:assert/strict"
import { test } from "node:test"

import {
  defaultCapabilitiesForPlanSlug,
} from "../../../server/services/membership-capabilities.ts"
import {
  CURRICULUM_PLANNING_EXAMPLES,
  LOCAL_SESSION_INVENTORY_KEYS,
  buildSessionNavigation,
  canPublishRecordedSession,
  filterRecordedSessions,
  findDurationMatch,
  formatFocusLabel,
  humanizeLocalMediaBasename,
  isRecordedSessionMemberVisible,
  matchInventoryKeyForFilename,
  productGrantImpliesRecordedSessions,
  shouldPublishCurriculumPlanRow,
  shouldShowArchiveFilters,
  slugifyRecordedSessionTitle,
  sortRecordedSessionsNewestFirst,
} from "./recorded-sessions.ts"

function session(
  overrides: Partial<{
    id: string
    slug: string
    title: string
    shortDescription: string | null
    recordedAt: string | null
    publishedAt: string | null
    durationSeconds: number | null
    presenter: string | null
    monthlyTheme: string | null
    weekNumber: number | null
    weeklyTopic: string | null
    focus: "awareness" | "release" | "embodiment" | "integration" | null
    thumbnailUrl: string | null
    displayOrder: number
  }> = {}
) {
  return {
    id: overrides.id ?? "s1",
    slug: overrides.slug ?? "session-1",
    title: overrides.title ?? "Session One",
    shortDescription: overrides.shortDescription ?? null,
    recordedAt: overrides.recordedAt ?? "2026-07-01",
    publishedAt: overrides.publishedAt ?? "2026-07-02",
    durationSeconds: overrides.durationSeconds ?? 1800,
    presenter: overrides.presenter ?? "Dr. Deepa",
    monthlyTheme: overrides.monthlyTheme ?? null,
    weekNumber: overrides.weekNumber ?? null,
    weeklyTopic: overrides.weeklyTopic ?? null,
    focus: overrides.focus ?? null,
    thumbnailUrl: overrides.thumbnailUrl ?? null,
    displayOrder: overrides.displayOrder ?? 0,
  }
}

// 1
test("publish requires ready Mux and signed playback id", () => {
  assert.equal(
    canPublishRecordedSession({
      processingStatus: "ready",
      muxPlaybackId: "pb_123",
    }),
    true
  )
  assert.equal(
    canPublishRecordedSession({
      processingStatus: "processing",
      muxPlaybackId: "pb_123",
    }),
    false
  )
  assert.equal(
    canPublishRecordedSession({ processingStatus: "ready", muxPlaybackId: "" }),
    false
  )
})

// 2
test("draft sessions are not member-visible even with Mux ready", () => {
  assert.equal(
    isRecordedSessionMemberVisible({
      publicationStatus: "draft",
      processingStatus: "ready",
      muxPlaybackId: "pb",
    }),
    false
  )
})

// 3
test("published + ready is member-visible", () => {
  assert.equal(
    isRecordedSessionMemberVisible({
      publicationStatus: "published",
      processingStatus: "ready",
      muxPlaybackId: "pb",
    }),
    true
  )
})

// 4
test("Reset-only product does not grant recorded sessions", () => {
  assert.equal(
    productGrantImpliesRecordedSessions({
      hasActiveMembershipCapability: false,
      hasResetProductOnly: true,
      hasEbookProductOnly: false,
    }),
    false
  )
})

// 5
test("ebook-only product does not grant recorded sessions", () => {
  assert.equal(
    productGrantImpliesRecordedSessions({
      hasActiveMembershipCapability: false,
      hasResetProductOnly: false,
      hasEbookProductOnly: true,
    }),
    false
  )
})

// 6
test("active membership capability grants recorded sessions", () => {
  assert.equal(
    productGrantImpliesRecordedSessions({
      hasActiveMembershipCapability: true,
      hasResetProductOnly: true,
      hasEbookProductOnly: true,
    }),
    true
  )
})

// 7–9
test("Core/Gold/Platinum all include session_replays capability", () => {
  for (const slug of ["plan-1", "plan-2", "plan-3"]) {
    assert.ok(
      defaultCapabilitiesForPlanSlug(slug).includes("session_replays"),
      `${slug} missing session_replays`
    )
  }
})

// 10
test("tiers share session_replays; Core still lacks in-person", () => {
  assert.equal(
    defaultCapabilitiesForPlanSlug("plan-1").includes("in_person_sessions"),
    false
  )
  assert.ok(defaultCapabilitiesForPlanSlug("plan-2").includes("in_person_sessions"))
})

// 11
test("slugify produces stable lowercase hyphenated ids", () => {
  assert.equal(slugifyRecordedSessionTitle("Inner Child Healing"), "inner-child-healing")
  assert.equal(slugifyRecordedSessionTitle("  Visualization  Alignment "), "visualization-alignment")
})

// 12
test("humanize basename does not invent curriculum metadata", () => {
  assert.equal(
    humanizeLocalMediaBasename("Inner_child_healing.mp4"),
    "Inner Child Healing"
  )
})

// 13
test("inventory matches known mp4 filenames and excludes m4a patterns", () => {
  assert.equal(
    matchInventoryKeyForFilename("Inner_child_healing.mp4")?.key,
    "inner-child-healing"
  )
  assert.equal(matchInventoryKeyForFilename("Inner_child_audio.m4a"), null)
  assert.equal(
    matchInventoryKeyForFilename("Trauma_heaing.mp4")?.key,
    "trauma-healing"
  )
  assert.equal(
    matchInventoryKeyForFilename("Visualization_ alignment.mp4")?.key,
    "visualization-alignment"
  )
})

// 14
test("inventory includes fifth activate-money-mindset key for mp4 only", () => {
  assert.equal(
    matchInventoryKeyForFilename("Activate Money Mindset.mp4")?.key,
    "activate-money-mindset"
  )
  assert.equal(
    matchInventoryKeyForFilename("Copy of Activate Money Mindset.wav"),
    null
  )
  assert.equal(LOCAL_SESSION_INVENTORY_KEYS.length, 5)
  assert.equal(
    LOCAL_SESSION_INVENTORY_KEYS.find((e) => e.key === "visualization-alignment")
      ?.provisionalTitle,
    "Visualization"
  )
})

// 15
test("duration matcher links existing Mux assets within tolerance", () => {
  const match = findDurationMatch(
    [
      { id: "a", duration: 100 },
      { id: "b", duration: 2434 },
      { id: "c", duration: 2500 },
    ],
    2430
  )
  assert.equal(match?.id, "b")
})

// 16
test("duration matcher returns null when no asset is close", () => {
  assert.equal(findDurationMatch([{ id: "a", duration: 100 }], 2434), null)
})

// 17
test("curriculum examples never auto-publish unrecorded rows", () => {
  for (const row of CURRICULUM_PLANNING_EXAMPLES) {
    assert.equal(row.recorded, false)
    assert.equal(
      shouldPublishCurriculumPlanRow({ recorded: row.recorded, hasMuxPlayback: true }),
      false
    )
  }
})

// 18
test("curriculum row publishes only when recorded and Mux ready", () => {
  assert.equal(
    shouldPublishCurriculumPlanRow({ recorded: true, hasMuxPlayback: true }),
    true
  )
  assert.equal(
    shouldPublishCurriculumPlanRow({ recorded: true, hasMuxPlayback: false }),
    false
  )
})

// 19
test("archive sorts newest recorded date first", () => {
  const sorted = sortRecordedSessionsNewestFirst([
    session({ id: "old", recordedAt: "2026-01-01", title: "Old" }),
    session({ id: "new", recordedAt: "2026-08-01", title: "New" }),
  ])
  assert.equal(sorted[0]?.id, "new")
  assert.equal(sorted[1]?.id, "old")
})

// 20
test("filters apply theme focus year and search", () => {
  const list = [
    session({
      id: "a",
      title: "Alpha",
      monthlyTheme: "Safety",
      focus: "awareness",
      recordedAt: "2026-03-01",
    }),
    session({
      id: "b",
      title: "Beta",
      monthlyTheme: "Expansion",
      focus: "release",
      recordedAt: "2025-03-01",
      weeklyTopic: "Softening",
    }),
  ]
  assert.equal(filterRecordedSessions(list, { theme: "safety" }).length, 1)
  assert.equal(filterRecordedSessions(list, { focus: "release" })[0]?.id, "b")
  assert.equal(filterRecordedSessions(list, { year: 2025 })[0]?.id, "b")
  assert.equal(filterRecordedSessions(list, { search: "soft" })[0]?.id, "b")
})

// 21
test("filters stay hidden until archive has useful facets", () => {
  assert.equal(shouldShowArchiveFilters([session(), session()]), false)
  assert.equal(
    shouldShowArchiveFilters([
      session({ id: "1", monthlyTheme: "A", focus: "awareness" }),
      session({ id: "2", monthlyTheme: "B", focus: "release" }),
      session({ id: "3", monthlyTheme: "A", focus: "embodiment" }),
      session({ id: "4", monthlyTheme: "B", focus: "integration" }),
    ]),
    true
  )
})

// 22
test("prev/next navigation has no completion gate", () => {
  const list = [
    session({ id: "n", recordedAt: "2026-08-01", title: "Newest" }),
    session({ id: "m", recordedAt: "2026-07-01", title: "Middle" }),
    session({ id: "o", recordedAt: "2026-06-01", title: "Oldest" }),
  ]
  const nav = buildSessionNavigation(list, "m")
  assert.equal(nav.previous?.id, "n")
  assert.equal(nav.next?.id, "o")
})

// 23
test("focus labels are customer-friendly", () => {
  assert.equal(formatFocusLabel("awareness"), "Awareness")
  assert.equal(formatFocusLabel(null), null)
})

// 24
test("displayOrder wins over date when sorting", () => {
  const sorted = sortRecordedSessionsNewestFirst([
    session({ id: "later", recordedAt: "2026-08-01", displayOrder: 2 }),
    session({ id: "earlier", recordedAt: "2026-01-01", displayOrder: 1 }),
  ])
  assert.equal(sorted[0]?.id, "earlier")
})

// 25
test("m4a and wav are never inventory keys for linking", () => {
  assert.equal(matchInventoryKeyForFilename("Manifestation_breathwork.m4a"), null)
  assert.equal(matchInventoryKeyForFilename("Trauma_audio.m4a"), null)
  assert.equal(
    matchInventoryKeyForFilename("Copy of Activate Money Mindset.wav"),
    null
  )
})

// 26 (still part of the recorded-sessions suite; keep explicit coverage at 25+)
test("published without playback is not member-visible", () => {
  assert.equal(
    isRecordedSessionMemberVisible({
      publicationStatus: "published",
      processingStatus: "ready",
      muxPlaybackId: null,
    }),
    false
  )
})

// 27
test("navigation ends cleanly at newest and oldest edges", () => {
  const list = [
    session({ id: "n", recordedAt: "2026-08-01", title: "Newest" }),
    session({ id: "o", recordedAt: "2026-06-01", title: "Oldest" }),
  ]
  assert.equal(buildSessionNavigation(list, "n").previous, null)
  assert.equal(buildSessionNavigation(list, "o").next, null)
})
