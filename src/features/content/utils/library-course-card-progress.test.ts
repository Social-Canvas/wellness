import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

import { RESET_COURSE_ID } from "../../checkout/constants/destinations.ts"
import {
  libraryCourseProgressPercentage,
  resolveLibraryCourseCardProgress,
} from "./library-course-card-progress.ts"

const ROOT = join(import.meta.dirname, "../../../..")

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8")
}

const RESET_TOTAL_PUBLISHED = 22

test("accessible course with no progress shows Not started", () => {
  const view = resolveLibraryCourseCardProgress({
    courseId: RESET_COURSE_ID,
    canOpen: true,
    isAvailable: true,
    completedLessons: 0,
    totalLessons: RESET_TOTAL_PUBLISHED,
  })

  assert.equal(view.kind, "not_started")
  assert.equal(view.progressLabel, "Not started")
  assert.equal(view.progressPercentage, 0)
  assert.equal(view.ctaLabel, "Start course")
  assert.equal(view.href, `/dashboard/library/${RESET_COURSE_ID}`)
  assert.notEqual(view.progressLabel, "Coming soon")
})

test("partial progress shows the correct lesson count and percentage", () => {
  const completed = 5
  const view = resolveLibraryCourseCardProgress({
    courseId: RESET_COURSE_ID,
    canOpen: true,
    isAvailable: true,
    completedLessons: completed,
    totalLessons: RESET_TOTAL_PUBLISHED,
  })

  assert.equal(view.kind, "in_progress")
  assert.equal(view.progressLabel, `${completed} of ${RESET_TOTAL_PUBLISHED} lessons`)
  assert.equal(
    view.progressPercentage,
    libraryCourseProgressPercentage(completed, RESET_TOTAL_PUBLISHED)
  )
  assert.equal(view.progressPercentage, 23)
  assert.equal(view.ctaLabel, "Continue course")
  assert.equal(view.href, `/dashboard/library/${RESET_COURSE_ID}`)
})

test("completed course shows Completed", () => {
  const view = resolveLibraryCourseCardProgress({
    courseId: RESET_COURSE_ID,
    canOpen: true,
    isAvailable: true,
    completedLessons: RESET_TOTAL_PUBLISHED,
    totalLessons: RESET_TOTAL_PUBLISHED,
  })

  assert.equal(view.kind, "completed")
  assert.equal(view.progressLabel, "Completed")
  assert.equal(view.progressPercentage, 100)
  assert.equal(view.ctaLabel, "Review course")
  assert.notEqual(view.progressPercentage, 0)
})

test("unpublished inaccessible course may show Coming soon", () => {
  const view = resolveLibraryCourseCardProgress({
    courseId: "draft-course-id",
    canOpen: false,
    isAvailable: false,
    completedLessons: 0,
    totalLessons: 0,
  })

  assert.equal(view.kind, "coming_soon")
  assert.equal(view.progressLabel, "Coming soon")
  assert.equal(view.ctaLabel, null)
  assert.equal(view.href, null)
})

test("an accessible course never shows Coming soon", () => {
  const cases = [
    { completedLessons: 0, totalLessons: RESET_TOTAL_PUBLISHED },
    { completedLessons: 3, totalLessons: RESET_TOTAL_PUBLISHED },
    { completedLessons: RESET_TOTAL_PUBLISHED, totalLessons: RESET_TOTAL_PUBLISHED },
    { completedLessons: 0, totalLessons: 0 },
  ] as const

  for (const facts of cases) {
    const view = resolveLibraryCourseCardProgress({
      courseId: RESET_COURSE_ID,
      canOpen: true,
      isAvailable: true,
      ...facts,
    })

    assert.notEqual(view.kind, "coming_soon")
    assert.notEqual(view.progressLabel, "Coming soon")
    assert.ok(view.ctaLabel)
    assert.ok(view.href)
  }

  // Even if mistakenly marked unavailable, canOpen still blocks Coming soon.
  const openableDraft = resolveLibraryCourseCardProgress({
    courseId: RESET_COURSE_ID,
    canOpen: true,
    isAvailable: false,
    completedLessons: 1,
    totalLessons: RESET_TOTAL_PUBLISHED,
  })
  assert.notEqual(openableDraft.kind, "coming_soon")
  assert.notEqual(openableDraft.progressLabel, "Coming soon")
})

test("existing progress records remain unchanged", () => {
  const progressService = readSource(
    "src/features/progress/services/progress.service.ts"
  )
  const libraryPage = readSource(
    "src/app/(dashboard)/dashboard/library/page.tsx"
  )
  const card = readSource(
    "src/features/content/components/LibraryCourseCard.tsx"
  )
  const resolver = readSource(
    "src/features/content/utils/library-course-card-progress.ts"
  )
  const membershipCard = readSource(
    "src/features/dashboard/components/membership-library-card.tsx"
  )
  const membershipUtil = readSource(
    "src/features/dashboard/utils/library-membership.ts"
  )

  // Library list uses a read-only snapshot — no upsert/rewrite of progress.
  assert.match(progressService, /getLibraryCourseProgressSnapshots/)
  assert.match(
    progressService,
    /Read-only published-lesson progress for My Library cards/
  )
  assert.doesNotMatch(
    libraryPage,
    /calculateCourseProgress|upsertCourseProgress|\.upsert\(/
  )
  assert.match(libraryPage, /getLibraryCourseProgressSnapshots/)
  assert.match(libraryPage, /resolveLibraryCourseCardProgress/)

  // Card no longer hardcodes the Coming soon placeholder for accessible courses.
  assert.doesNotMatch(card, /LibraryProgressPlaceholder/)
  assert.match(card, /resolveLibraryCourseCardProgress|progress\./)
  assert.match(resolver, /Coming soon is reserved/)

  // Membership cards do not use course-progress language.
  assert.doesNotMatch(membershipCard, /Not started|of \d+ lessons|Review course|Start course/)
  assert.doesNotMatch(membershipUtil, /Not started|Continue course|Review course/)
  assert.match(membershipUtil, /ctaLabel: "Open membership"/)

  // Reset course id/path preserved.
  assert.match(resolver, /\/dashboard\/library\/\$\{courseId\}/)
  assert.equal(
    resolveLibraryCourseCardProgress({
      courseId: RESET_COURSE_ID,
      canOpen: true,
      isAvailable: true,
      completedLessons: 0,
      totalLessons: RESET_TOTAL_PUBLISHED,
    }).href,
    `/dashboard/library/${RESET_COURSE_ID}`
  )
})

test("contradictory Coming soon + open CTA cannot occur", () => {
  const view = resolveLibraryCourseCardProgress({
    courseId: RESET_COURSE_ID,
    canOpen: true,
    isAvailable: true,
    completedLessons: 0,
    totalLessons: 10,
  })
  assert.notEqual(view.kind, "coming_soon")
  assert.ok(view.ctaLabel)

  const comingSoon = resolveLibraryCourseCardProgress({
    courseId: "x",
    canOpen: false,
    isAvailable: false,
    completedLessons: 0,
    totalLessons: 0,
  })
  assert.equal(comingSoon.ctaLabel, null)
  assert.equal(comingSoon.href, null)
})
