import assert from "node:assert/strict"
import { test } from "node:test"

import type { LibraryLesson, LibraryModule } from "../types/index.ts"
import {
  availableProgressPercent,
  buildLessonContextLine,
  buildModuleProgressSummary,
  deriveLessonHeadline,
  deriveOutlineLessonTitle,
  shouldShowRequiredLabel,
} from "./lesson-display.ts"
import {
  buildLessonNavigation,
  flattenOutlineLessons,
  resolveContinueDestination,
  resolveCourseHref,
  resolveLessonHref,
} from "./lesson-navigation.ts"
import { resolvePosterUrl } from "./poster-url.ts"

function lesson(
  overrides: Partial<LibraryLesson> & Pick<LibraryLesson, "id" | "title" | "moduleId">
): LibraryLesson {
  return {
    slug: overrides.id,
    sortOrder: 0,
    isRequired: true,
    videoId: `${overrides.id}-video`,
    hasVideo: true,
    durationSeconds: 60,
    isCompleted: false,
    status: "published",
    isAvailable: true,
    ...overrides,
  }
}

function moduleOf(
  id: string,
  title: string,
  sortOrder: number,
  lessons: LibraryLesson[]
): LibraryModule {
  return {
    id,
    courseId: "course-1",
    title,
    slug: id,
    description: null,
    sortOrder,
    status: "published",
    lessons: lessons.map((entry, index) => ({ ...entry, sortOrder: index + 1 })),
  }
}

/** Mirrors current Reset shape: 19 available + 3 draft evenings in preview. */
function buildResetPreviewModules(): LibraryModule[] {
  const welcome = moduleOf("welcome", "Welcome", 0, [
    lesson({ id: "welcome", title: "Welcome", moduleId: "welcome" }),
  ])

  const dayModules: LibraryModule[] = []

  for (let day = 1; day <= 7; day += 1) {
    const moduleId = `day-${day}`
    const moduleTitle = `Day ${day}`
    const lessons: LibraryLesson[] = [
      lesson({
        id: `${moduleId}-morning`,
        title: `${moduleTitle}: Morning Meditation`,
        moduleId,
      }),
      lesson({
        id: `${moduleId}-afternoon`,
        title: `${moduleTitle}: Afternoon Regroup / Refocus`,
        moduleId,
      }),
    ]

    if (day <= 4) {
      lessons.push(
        lesson({
          id: `${moduleId}-evening`,
          title: `${moduleTitle}: Evening Meditation`,
          moduleId,
        })
      )
    } else {
      lessons.push(
        lesson({
          id: `${moduleId}-evening`,
          title: `${moduleTitle}: Evening Meditation`,
          moduleId,
          status: "draft",
          isAvailable: false,
          isCompleted: false,
          hasVideo: false,
          videoId: null,
        })
      )
    }

    dayModules.push(moduleOf(moduleId, moduleTitle, day, lessons))
  }

  return [welcome, ...dayModules]
}

function buildNormalMemberModules(): LibraryModule[] {
  return buildResetPreviewModules().map((module) => ({
    ...module,
    lessons: module.lessons.filter((entry) => entry.isAvailable),
  }))
}

test("previous and next are derived from canonical order", () => {
  const modules = buildNormalMemberModules()
  const nav = buildLessonNavigation(modules, "day-1-morning")

  assert.equal(nav.previous?.id, "welcome")
  assert.equal(nav.next?.id, "day-1-afternoon")
})

test("first lesson has no previous destination", () => {
  const nav = buildLessonNavigation(buildNormalMemberModules(), "welcome")
  assert.equal(nav.previous, null)
  assert.ok(nav.next)
  assert.equal(nav.currentIndex, 1)
})

test("last available lesson has no next lesson destination", () => {
  const modules = buildNormalMemberModules()
  const flat = flattenOutlineLessons(modules)
  const last = flat[flat.length - 1]!
  const nav = buildLessonNavigation(modules, last.id)

  assert.equal(nav.next, null)
  assert.equal(nav.currentIndex, nav.availableCount)
})

test("draft lessons are skipped in normal navigation", () => {
  const modules = buildNormalMemberModules()
  const nav = buildLessonNavigation(modules, "day-4-evening")

  assert.equal(nav.next?.id, "day-5-morning")
  assert.equal(
    nav.available.some((entry) => entry.id === "day-5-evening"),
    false
  )
  assert.equal(nav.availableCount, 19)
})

test("preview outline shows drafts as disabled Coming soon", () => {
  const modules = buildResetPreviewModules()
  const nav = buildLessonNavigation(modules, "day-1-morning")
  const drafts = nav.outline.filter((entry) => !entry.isAvailable)

  assert.equal(nav.outline.length, 22)
  assert.equal(drafts.length, 3)
  assert.deepEqual(
    drafts.map((entry) => entry.id).sort(),
    ["day-5-evening", "day-6-evening", "day-7-evening"]
  )
  assert.equal(
    drafts.every((entry) => entry.status === "draft" && !entry.isAvailable),
    true
  )
})

test("ordinary members cannot navigate to drafts", () => {
  const modules = buildNormalMemberModules()
  const nav = buildLessonNavigation(modules, "day-5-afternoon")

  assert.equal(nav.next?.id, "day-6-morning")
  assert.equal(
    nav.available.some((entry) => entry.id.endsWith("-evening") && entry.id.includes("day-5")),
    false
  )
  assert.equal(
    resolveLessonHref("course-1", "day-5-evening", false).includes("day-5-evening"),
    true
  )
  // Navigation model never points prev/next at draft ids.
  assert.notEqual(nav.previous?.id, "day-5-evening")
  assert.notEqual(nav.next?.id, "day-5-evening")
})

test("progress uses available lesson count", () => {
  const modules = buildResetPreviewModules()
  const nav = buildLessonNavigation(modules, "welcome")

  assert.equal(nav.availableCount, 19)
  assert.equal(nav.comingSoonCount, 3)
  assert.equal(nav.completedAvailableCount, 0)
})

test("current Reset state produces 19 available and 3 Coming soon in preview", () => {
  const modules = buildResetPreviewModules()
  const nav = buildLessonNavigation(modules, "welcome")

  assert.equal(nav.availableCount, 19)
  assert.equal(nav.comingSoonCount, 3)
  assert.equal(nav.outline.length, 22)
})

test("completed lesson redirects to the correct next available lesson", () => {
  const destination = resolveContinueDestination({
    courseId: "course-1",
    preview: false,
    next: {
      id: "day-1-afternoon",
      title: "Day 1: Afternoon",
      moduleTitle: "Day 1",
      durationSeconds: 333,
    },
  })

  assert.equal(
    destination,
    "/dashboard/library/course-1/lesson/day-1-afternoon"
  )
})

test("final lesson redirects to the course overview", () => {
  const destination = resolveContinueDestination({
    courseId: "course-1",
    preview: true,
    next: null,
  })

  assert.equal(destination, "/dashboard/library/course-1?preview=1")
})

test("the browser cannot supply an arbitrary next destination", () => {
  // resolveContinueDestination only accepts server-built AdjacentLessonRef | null.
  const spoofedClientNext = "https://evil.example/steal"
  const destination = resolveContinueDestination({
    courseId: "course-1",
    preview: false,
    next: null,
  })

  assert.equal(destination, resolveCourseHref("course-1", false))
  assert.equal(destination.includes(spoofedClientNext), false)
  assert.match(destination, /^\/dashboard\/library\//)
})

test("mark-complete-and-continue destination is idempotent for same next", () => {
  const next = {
    id: "day-1-afternoon",
    title: "Afternoon",
    moduleTitle: "Day 1",
    durationSeconds: 333,
  }

  const first = resolveContinueDestination({
    courseId: "course-1",
    preview: false,
    next,
  })
  const second = resolveContinueDestination({
    courseId: "course-1",
    preview: false,
    next,
  })

  assert.equal(first, second)
})

test("deriveLessonHeadline strips module prefix once", () => {
  assert.equal(
    deriveLessonHeadline("Day 1: Morning Meditation", "Day 1"),
    "Morning Meditation"
  )
  assert.equal(deriveLessonHeadline("Welcome", "Welcome"), "Welcome")
})

test("deriveOutlineLessonTitle matches headline stripping", () => {
  assert.equal(
    deriveOutlineLessonTitle("Day 1: Afternoon Regroup / Refocus", "Day 1"),
    "Afternoon Regroup / Refocus"
  )
})

test("buildLessonContextLine reports available index", () => {
  assert.equal(
    buildLessonContextLine({
      moduleTitle: "Day 1",
      currentIndex: 2,
      availableCount: 19,
      isAvailable: true,
    }),
    "Day 1 · Lesson 2 of 19 available"
  )
})

test("shouldShowRequiredLabel only when required/optional mix exists", () => {
  assert.equal(
    shouldShowRequiredLabel(
      [{ isRequired: true }, { isRequired: true }],
      true
    ),
    false
  )
  assert.equal(
    shouldShowRequiredLabel(
      [{ isRequired: true }, { isRequired: false }],
      true
    ),
    true
  )
  assert.equal(
    shouldShowRequiredLabel(
      [{ isRequired: true }, { isRequired: false }],
      false
    ),
    false
  )
})

test("buildModuleProgressSummary and available progress percent", () => {
  assert.equal(
    buildModuleProgressSummary([
      { isAvailable: true, isCompleted: true },
      { isAvailable: true, isCompleted: false },
      { isAvailable: false, isCompleted: false },
    ]),
    "1/2 complete"
  )
  assert.equal(
    buildModuleProgressSummary([
      { isAvailable: false, isCompleted: false },
    ]),
    "Coming soon"
  )
  assert.equal(availableProgressPercent(2, 19), 11)
  assert.equal(availableProgressPercent(0, 0), 0)
})

test("invalid or missing poster does not resolve to a renderable URL", () => {
  assert.equal(resolvePosterUrl(null), undefined)
  assert.equal(resolvePosterUrl(undefined), undefined)
  assert.equal(resolvePosterUrl(""), undefined)
  assert.equal(resolvePosterUrl("   "), undefined)
  assert.equal(resolvePosterUrl("not-a-url"), undefined)
  assert.equal(resolvePosterUrl("javascript:alert(1)"), undefined)
  assert.equal(
    resolvePosterUrl("https://image.mux.com/abc/thumbnail.jpg"),
    "https://image.mux.com/abc/thumbnail.jpg"
  )
})

test("preview query is preserved only via server-authorized flag helpers", () => {
  assert.equal(
    resolveLessonHref("course-1", "lesson-1", true),
    "/dashboard/library/course-1/lesson/lesson-1?preview=1"
  )
  assert.equal(
    resolveLessonHref("course-1", "lesson-1", false),
    "/dashboard/library/course-1/lesson/lesson-1"
  )
})
