import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  AUTOIMMUNE_CANONICAL_TITLES,
  AUTOIMMUNE_COURSE_SLUG,
  AUTOIMMUNE_VIDEO_MAPPINGS,
  assertExactAutoimmuneVideoInventory,
  dryRunAllowlistCounts,
  findReusableAutoimmuneMuxAsset,
  inventoryAutoimmuneVideos,
  lessonVideoAvailabilityLabel,
  matchAutoimmuneVideoFilename,
  shouldUploadAutoimmuneVideo,
} from "./autoimmune-video-associations.ts"
import {
  countCompletedLessons,
  deriveLessonProgressState,
  isLessonCompletedFromProgress,
  lessonHasPlayableVideo,
  lessonProgressCta,
  lessonProgressLabel,
} from "./lesson-progress-state.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function read(relative: string): string {
  return readFileSync(join(root, relative), "utf8")
}

const CANONICAL_FILENAMES = [
  "Intro to Autoimmune.mp4",
  "Masterclass_Day1_autoimmune.mp4",
  "Masterclass_Day2_autoimmune.mp4",
  "Day 3 Inflammation.mp4",
  "Day 4_Gut Health.mp4",
  "Day 5_Hormonal Imbalance.mp4",
]

test("1. canonical Autoimmune course slug is reused", () => {
  assert.equal(AUTOIMMUNE_COURSE_SLUG, "autoimmune-masterclass")
  const importScript = read("scripts/autoimmune-course-import.mjs")
  assert.match(importScript, /COURSE_SLUG = "autoimmune-masterclass"/)
  assert.match(importScript, /courseReused: true/)
  assert.doesNotMatch(importScript, /\.from\("courses"\)\s*\n\s*\.insert\(/)
})

test("2. exactly six canonical lesson mappings exist", () => {
  assert.equal(AUTOIMMUNE_VIDEO_MAPPINGS.length, 6)
  assert.deepEqual(AUTOIMMUNE_CANONICAL_TITLES, [
    "Intro to Autoimmune",
    "Masterclass Day 1",
    "Masterclass Day 2",
    "Day 3 Inflammation",
    "Day 4 Gut Health",
    "Day 5 Hormonal Imbalance",
  ])
})

test("3. exactly six video files map to those lessons", () => {
  const result = assertExactAutoimmuneVideoInventory(CANONICAL_FILENAMES)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.matched.length, 6)
    assert.equal(result.matched[0]?.lessonSlug, "intro")
    assert.equal(result.matched[5]?.lessonSlug, "lesson-05")
  }
})

test("4. existing ready assets are reused", () => {
  const reusable = findReusableAutoimmuneMuxAsset(
    [
      {
        id: "asset_intro",
        status: "ready",
        playbackId: "pb_intro",
        passthrough: JSON.stringify({
          purpose: "autoimmune_course",
          lesson_key: "intro",
        }),
      },
    ],
    "intro"
  )
  assert.ok(reusable)
  assert.equal(reusable?.id, "asset_intro")
  assert.equal(shouldUploadAutoimmuneVideo(reusable), false)
})

test("5. missing assets upload once", () => {
  assert.equal(shouldUploadAutoimmuneVideo(null), true)
  const missing = findReusableAutoimmuneMuxAsset([], "day-1")
  assert.equal(missing, null)
})

test("6. migration is idempotent for matching passthrough assets", () => {
  const assets = [
    {
      id: "asset_day2",
      status: "ready",
      playbackId: "pb_day2",
      passthrough: JSON.stringify({
        purpose: "autoimmune_course",
        lesson_key: "day-2",
      }),
    },
  ]
  const first = findReusableAutoimmuneMuxAsset(assets, "day-2", "asset_day2")
  const second = findReusableAutoimmuneMuxAsset(assets, "day-2")
  assert.equal(first?.id, second?.id)
  assert.equal(shouldUploadAutoimmuneVideo(first), false)
  assert.equal(shouldUploadAutoimmuneVideo(second), false)
})

test("7. ready lesson requires protected playback reference", () => {
  assert.equal(
    lessonHasPlayableVideo({ muxPlaybackId: "signed_pb_1" }),
    true
  )
  assert.equal(lessonHasPlayableVideo({ mux_playback_id: "signed_pb_2" }), true)
  assert.equal(lessonHasPlayableVideo({ muxPlaybackId: null }), false)
  assert.equal(lessonHasPlayableVideo(null), false)
})

test("8. ready lesson does not show No video", () => {
  assert.equal(
    lessonVideoAvailabilityLabel({ hasPlayableVideo: true }),
    "video"
  )
  assert.notEqual(
    lessonVideoAvailabilityLabel({ hasPlayableVideo: true }),
    "no_video"
  )
})

test("9. processing lesson shows processing state", () => {
  assert.equal(
    lessonVideoAvailabilityLabel({
      hasPlayableVideo: false,
      processing: true,
    }),
    "processing"
  )
})

test("10. failed asset shows safe error state", () => {
  assert.equal(
    lessonVideoAvailabilityLabel({
      hasPlayableVideo: false,
      failed: true,
    }),
    "error"
  )
})

test("11. user with zero progress does not see Completed", () => {
  const state = deriveLessonProgressState(null)
  assert.equal(state, "not_started")
  assert.equal(lessonProgressLabel(state), "Not started")
  assert.notEqual(lessonProgressLabel(state), "Completed")
  assert.equal(isLessonCompletedFromProgress(undefined), false)
})

test("12. actual completed lesson shows Completed", () => {
  const state = deriveLessonProgressState({
    completedAt: "2026-08-01T00:00:00.000Z",
  })
  assert.equal(state, "completed")
  assert.equal(lessonProgressLabel(state), "Completed")
  assert.equal(lessonProgressCta(state), "Review")
})

test("13. publication state is not treated as completion", () => {
  const content = read("src/features/content/services/content.service.ts")
  assert.match(content, /isLessonCompletedFromProgress|completedAt/)
  assert.doesNotMatch(
    content,
    /isCompleted\s*=\s*!video/
  )
  assert.doesNotMatch(
    content,
    /isCompleted\s*=\s*video\?\.id[\s\S]*:\s*true/
  )
})

test("14. video availability is not treated as completion", () => {
  assert.equal(
    isLessonCompletedFromProgress({
      completedAt: null,
      lastPositionSeconds: 0,
    }),
    false
  )
  assert.equal(lessonHasPlayableVideo({ muxPlaybackId: "pb" }), true)
  assert.equal(
    isLessonCompletedFromProgress({ completedAt: null }),
    false
  )
})

test("15. course progress count matches lesson statuses", () => {
  const lessons = [
    { videoId: "v1" },
    { videoId: "v2" },
    { videoId: "v3" },
    { videoId: null },
    { videoId: "v5" },
    { videoId: "v6" },
  ]
  const zero = countCompletedLessons(lessons, new Set())
  assert.deepEqual(zero, { completed: 0, total: 6 })

  const partial = countCompletedLessons(lessons, new Set(["v1", "v3"]))
  assert.deepEqual(partial, { completed: 2, total: 6 })

  // Missing video must never auto-count as complete.
  const missingVideoCountedWrong = countCompletedLessons(
    [{ videoId: null }, { videoId: null }],
    new Set()
  )
  assert.deepEqual(missingVideoCountedWrong, { completed: 0, total: 2 })
})

test("16. entitled playback requires six mapped lessons with signed refs", () => {
  const inventory = assertExactAutoimmuneVideoInventory(CANONICAL_FILENAMES)
  assert.equal(inventory.ok, true)
  const playbackRoute = read("src/app/api/mux/playback-token/route.ts")
  assert.match(playbackRoute, /createPlaybackToken/)
  assert.match(playbackRoute, /canAccessVideo|entitlement/i)
})

test("17. unauthorized user is denied by playback route entitlement checks", () => {
  const playbackRoute = read("src/app/api/mux/playback-token/route.ts")
  assert.match(playbackRoute, /entitlement_required|forbidden|401|403/)
})

test("18. Mux poster or branded fallback prevents broken images", () => {
  const poster = read("src/features/content/utils/poster-url.ts")
  assert.match(poster, /image\.mux\.com/)
  assert.match(poster, /return undefined/)
  const player = read("src/features/content/components/SecureMuxPlayer.tsx")
  assert.match(player, /resolvePosterUrl/)
  assert.match(player, /\.\.\.\(safePoster \? \{ poster: safePoster \} : \{\}\)/)
})

test("19. no duplicate lessons or Mux uploads for exact inventory", () => {
  const inventory = inventoryAutoimmuneVideos([
    ...CANONICAL_FILENAMES,
    "Intro to Autoimmune.mp4",
  ])
  assert.equal(inventory.duplicates.length, 1)
  assert.equal(inventory.matched.length, 6)

  const exact = assertExactAutoimmuneVideoInventory(CANONICAL_FILENAMES)
  assert.equal(exact.ok, true)
})

test("20. Stripe, memberships, Reset, nonprofit, testimonials remain out of scope", () => {
  const importScript = read("scripts/autoimmune-course-import.mjs")
  assert.doesNotMatch(importScript, /stripe\.(customers|checkout|prices)/i)
  assert.doesNotMatch(importScript, /from\("orders"\)/)
  assert.doesNotMatch(importScript, /7-day-reset/)
  assert.doesNotMatch(importScript, /homepage-testimonial|upload-homepage-testimonials/i)
  assert.doesNotMatch(importScript, /nonprofit/i)
  assert.doesNotMatch(importScript, /recorded_sessions|recorded-sessions/i)
  assert.match(importScript, /--videos-only/)
})

test("dry-run allowlist requires 6 videos, 6 lessons, 0 resources/mutations", () => {
  const ok = dryRunAllowlistCounts({
    selectedVideos: 6,
    selectedLessons: 6,
    resourcesSelected: 0,
  })
  assert.equal(ok.ok, true)

  const bad = dryRunAllowlistCounts({
    selectedVideos: 6,
    selectedLessons: 6,
    resourcesSelected: 4,
  })
  assert.equal(bad.ok, false)
  assert.match(bad.failures.join(" "), /resourcesSelected/)
})

test("in-progress progress uses Continue CTA and never Completed", () => {
  const state = deriveLessonProgressState({
    completedAt: null,
    lastPositionSeconds: 42,
  })
  assert.equal(state, "in_progress")
  assert.equal(lessonProgressLabel(state), "In progress")
  assert.equal(lessonProgressCta(state), "Continue")
})

test("filename matcher covers all six inventory names", () => {
  for (const name of CANONICAL_FILENAMES) {
    assert.ok(matchAutoimmuneVideoFilename(name), name)
  }
  assert.equal(matchAutoimmuneVideoFilename("random.mp4"), null)
})

test("RLS migration allows ready or published video selects", () => {
  const migration = read(
    "supabase/migrations/20260807180000_videos_select_ready_or_published.sql"
  )
  assert.match(migration, /videos_select_ready_or_published/)
  assert.match(migration, /status in \('ready', 'published'\)/)
  assert.match(migration, /drop policy if exists "videos_select_published"/)
})

test("progress service no longer auto-completes lessons without videoId", () => {
  const progress = read("src/features/progress/services/progress.service.ts")
  assert.doesNotMatch(
    progress,
    /if \(!lesson\.videoId \|\| completedVideoIds\.has\(lesson\.videoId\)\)/
  )
  assert.match(progress, /countCompletedLessons|completedVideoIds\.has/)
})
