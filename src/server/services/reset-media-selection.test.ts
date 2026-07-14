import assert from "node:assert/strict"
import { test } from "node:test"

// The selection logic lives with the migration tooling (plain ESM, not part of
// the app build). Node's native TS test runner strips types here and imports
// the .mjs module directly.
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

const MORNING_KEYS = [
  "day1_morning",
  "day2_morning",
  "day3_morning",
  "day4_morning",
  "day5_morning",
  "day6_morning",
  "day7_morning",
]

// 1. parseOnlyIds trims, splits, and drops empty fragments.
test("parseOnlyIds trims and filters empty fragments", () => {
  assert.deepEqual(parseOnlyIds(" day1_morning , day2_morning ,, "), [
    "day1_morning",
    "day2_morning",
  ])
  assert.deepEqual(parseOnlyIds(""), [])
  assert.deepEqual(parseOnlyIds(undefined as unknown as string), [])
})

// 2. --only selects exactly the seven morning keys and nothing else.
test("--only selects exactly the requested morning subset", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    only: MORNING_KEYS.join(","),
  })
  assert.deepEqual(
    selected.map((lesson: CanonicalLesson) => lesson.key),
    MORNING_KEYS
  )
})

// 3. Unselected entries (welcome/afternoon/evening) are provably excluded, so
// they can never reach the Mux/Supabase mutation loop.
test("--only excludes every welcome/afternoon/evening entry", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    only: MORNING_KEYS.join(","),
  })
  const selectedKeys = new Set(selected.map((lesson: CanonicalLesson) => lesson.key))

  assert.equal(selected.length, 7)
  assert.equal(selectedKeys.has("welcome"), false)
  for (let day = 1; day <= 7; day += 1) {
    assert.equal(selectedKeys.has(`day${day}_afternoon`), false)
    assert.equal(selectedKeys.has(`day${day}_evening`), false)
  }
  for (const lesson of selected) {
    assert.equal(lesson.lessonSlug, "morning")
  }
})

// 4. Selection preserves canonical ordering regardless of --only input order.
test("--only preserves canonical ordering", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    only: "day3_morning,day1_morning,day2_morning",
  })
  assert.deepEqual(
    selected.map((lesson: CanonicalLesson) => lesson.key),
    ["day1_morning", "day2_morning", "day3_morning"]
  )
})

// 5. Unknown identifiers are rejected before any processing.
test("--only rejects unknown identifiers", () => {
  assert.throws(
    () =>
      selectLessons(buildCanonicalLessons(), {
        only: "day1_morning,day8_morning",
      }),
    /unknown identifiers: day8_morning/
  )
})

// 6. Duplicate identifiers are rejected.
test("--only rejects duplicate identifiers", () => {
  assert.throws(
    () =>
      selectLessons(buildCanonicalLessons(), {
        only: "day1_morning,day1_morning",
      }),
    /duplicate identifiers: day1_morning/
  )
})

// 7. A whitespace/comma-only --only value is rejected rather than silently
// falling back to the full migration.
test("--only with no real identifiers is rejected", () => {
  assert.throws(
    () => selectLessons(buildCanonicalLessons(), { only: " , , " }),
    /contained no identifiers/
  )
})

// 8. --only and --lesson-key are mutually exclusive.
test("--only and --lesson-key together is rejected", () => {
  assert.throws(
    () =>
      selectLessons(buildCanonicalLessons(), {
        only: "day1_morning",
        lessonKey: "day2_morning",
      }),
    /not both/
  )
})

// 9. Legacy single --lesson-key still selects exactly one lesson.
test("--lesson-key selects a single lesson", () => {
  const selected = selectLessons(buildCanonicalLessons(), {
    lessonKey: "day4_morning",
  })
  assert.equal(selected.length, 1)
  assert.equal(selected[0].key, "day4_morning")
})

// 10. An unknown --lesson-key is rejected.
test("--lesson-key rejects an unknown key", () => {
  assert.throws(
    () => selectLessons(buildCanonicalLessons(), { lessonKey: "nope" }),
    /Unknown --lesson-key/
  )
})

// 11. No selection flag processes the full canonical set (all 22 lessons).
test("no flag selects the full 22-lesson set", () => {
  const selected = selectLessons(buildCanonicalLessons(), {})
  assert.equal(selected.length, 22)
})
