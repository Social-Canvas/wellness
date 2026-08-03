import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  parseOnlyIds,
  selectLessons,
} from "../../../scripts/reset-media-selection.mjs"

type CanonicalLesson = {
  key: string
  moduleSlug: string
  lessonSlug: string
  videoTitle: string
  isWelcome: boolean
}

function buildCanonicalLessons(): CanonicalLesson[] {
  const lessons: CanonicalLesson[] = [
    {
      key: "welcome",
      moduleSlug: "welcome",
      lessonSlug: "welcome",
      videoTitle: "7-Day Elevated Reset — Welcome",
      isWelcome: true,
    },
  ]

  for (let day = 1; day <= 7; day += 1) {
    lessons.push(
      {
        key: `day${day}_morning`,
        moduleSlug: `day-${day}`,
        lessonSlug: "morning",
        videoTitle: `7-Day Elevated Reset — Day ${day} Morning Meditation`,
        isWelcome: false,
      },
      {
        key: `day${day}_afternoon`,
        moduleSlug: `day-${day}`,
        lessonSlug: "afternoon",
        videoTitle: `7-Day Elevated Reset — Day ${day} Afternoon Regroup / Refocus`,
        isWelcome: false,
      },
      {
        key: `day${day}_evening`,
        moduleSlug: `day-${day}`,
        lessonSlug: "evening",
        videoTitle: `7-Day Elevated Reset — Day ${day} Evening Meditation`,
        isWelcome: false,
      }
    )
  }

  return lessons
}

const FINAL_FOUR = [
  "welcome",
  "day5_evening",
  "day6_evening",
  "day7_evening",
] as const

function read(path: string): string {
  return readFileSync(path, "utf8")
}

test("1. exact four-file allowlist selects only the final Reset targets", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    only: FINAL_FOUR.join(","),
  })
  assert.deepEqual(
    selected.map((lesson: CanonicalLesson) => lesson.key),
    [...FINAL_FOUR]
  )
  assert.equal(selected.length, 4)
  assert.deepEqual(parseOnlyIds(FINAL_FOUR.join(",")), [...FINAL_FOUR])
})

test("2. intro maps only to Welcome", () => {
  const selected = selectLessons(buildCanonicalLessons(), { only: "welcome" })
  assert.equal(selected.length, 1)
  assert.equal(selected[0].key, "welcome")
  assert.equal(selected[0].moduleSlug, "welcome")
  assert.equal(selected[0].lessonSlug, "welcome")
  assert.match(selected[0].videoTitle, /Welcome/)
})

test("3. Day 5 maps only to Day 5 Evening", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    only: "day5_evening",
  })
  assert.equal(selected.length, 1)
  assert.equal(selected[0].key, "day5_evening")
  assert.equal(selected[0].moduleSlug, "day-5")
  assert.equal(selected[0].lessonSlug, "evening")
  assert.match(selected[0].videoTitle, /Day 5 Evening/)
})

test("4. Day 6 maps only to Day 6 Evening", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    only: "day6_evening",
  })
  assert.equal(selected.length, 1)
  assert.equal(selected[0].moduleSlug, "day-6")
  assert.match(selected[0].videoTitle, /Day 6 Evening/)
})

test("5. Day 7 maps only to Day 7 Evening", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    only: "day7_evening",
  })
  assert.equal(selected.length, 1)
  assert.equal(selected[0].moduleSlug, "day-7")
  assert.match(selected[0].videoTitle, /Day 7 Evening/)
})

test("6-7. final-four allowlist is idempotent and excludes already-covered slots", () => {
  const first = selectLessons(buildCanonicalLessons(), {
    only: FINAL_FOUR.join(","),
  })
  const second = selectLessons(buildCanonicalLessons(), {
    only: FINAL_FOUR.join(","),
  })
  assert.deepEqual(
    first.map((lesson: CanonicalLesson) => lesson.key),
    second.map((lesson: CanonicalLesson) => lesson.key)
  )
  const keys = new Set(first.map((lesson: CanonicalLesson) => lesson.key))
  for (let day = 1; day <= 7; day += 1) {
    assert.equal(keys.has(`day${day}_morning`), false)
    assert.equal(keys.has(`day${day}_afternoon`), false)
  }
  for (let day = 1; day <= 4; day += 1) {
    assert.equal(keys.has(`day${day}_evening`), false)
  }
})

test("8-9. Welcome and Day 5–7 evenings remain distinct single lesson keys", () => {
  const canonical = buildCanonicalLessons()
  const welcome = canonical.filter((lesson) => lesson.key === "welcome")
  assert.equal(welcome.length, 1)
  for (const key of ["day5_evening", "day6_evening", "day7_evening"] as const) {
    assert.equal(canonical.filter((lesson) => lesson.key === key).length, 1)
  }
})

test("10-13. publish/playback gates remain signed + entitlement protected in route", () => {
  const route = read("src/app/api/mux/playback-token/route.ts")
  const playback = read("src/server/integrations/mux/playback.ts")
  const migrate = read("scripts/reset-media-migrate.mjs")
  assert.match(route, /createPlaybackToken/)
  assert.match(route, /canAccessVideo/)
  assert.match(route, /isVideoInPublishedLesson/)
  assert.match(playback, /signPlaybackId/)
  assert.match(migrate, /playback_policy:\s*\[["']signed["']\]/)
  assert.doesNotMatch(migrate, /playback_policy:\s*\[["']public["']\]/)
  assert.match(migrate, /ready|published/)
})

test("14-15. Morning, Afternoon, and Day 1–4 Evening remain outside final-four selection", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    only: FINAL_FOUR.join(","),
  })
  const selectedKeys = new Set(selected.map((lesson: CanonicalLesson) => lesson.key))
  assert.equal(selectedKeys.has("day1_morning"), false)
  assert.equal(selectedKeys.has("day7_afternoon"), false)
  assert.equal(selectedKeys.has("day4_evening"), false)
})

test("16-18. Reset selection tooling does not touch membership/testimonials/Stripe/email", () => {
  const selection = read("scripts/reset-media-selection.mjs")
  assert.doesNotMatch(selection, /recorded.?session/i)
  assert.doesNotMatch(selection, /testimonial/i)
  assert.doesNotMatch(selection, /stripe/i)
  assert.doesNotMatch(selection, /resend/i)
})

test("19. private Reset media paths stay gitignored", () => {
  const gitignore = read(".gitignore")
  assert.match(gitignore, /scripts\/reset-media-manifest\.json/)
  assert.match(gitignore, /scripts\/reset-media-manifest\.backup-\*\.json/)
  assert.match(gitignore, /docs\/7-day-elevated-reset-media-migration-status\.json/)
})

test("20. final Reset lesson ordering is Welcome then Day 1–7 morning/afternoon/evening", () => {
  const expected = ["welcome"]
  for (let day = 1; day <= 7; day += 1) {
    expected.push(`day${day}_morning`, `day${day}_afternoon`, `day${day}_evening`)
  }
  assert.deepEqual(
    buildCanonicalLessons().map((lesson) => lesson.key),
    expected
  )
  assert.equal(buildCanonicalLessons().length, 22)
})
