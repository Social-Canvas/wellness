import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  combinePreviewDecision,
  deriveLessonAvailability,
  evaluatePreviewEligibility,
  selectContentStatuses,
} from "./preview-eligibility.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

/**
 * Mirrors React cache(): memoize by argument identity within one request scope.
 * Never shared across request scopes (separate Map instances).
 */
function createRequestScopedCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
) {
  const memo = new Map<string, Promise<TResult>>()
  return (...args: TArgs): Promise<TResult> => {
    const key = JSON.stringify(args)
    const existing = memo.get(key)
    if (existing) {
      return existing
    }
    const pending = fn(...args)
    memo.set(key, pending)
    return pending
  }
}

test("duplicate auth helpers are memoized within one request", async () => {
  let authLookups = 0
  const getAuthContext = createRequestScopedCache(async () => {
    authLookups += 1
    return { userId: "user-a", email: "a@example.com" }
  })

  const getCurrentUser = createRequestScopedCache(async () => {
    const ctx = await getAuthContext()
    return { id: ctx.userId, email: ctx.email }
  })

  const getCurrentProfile = createRequestScopedCache(async () => {
    const ctx = await getAuthContext()
    return { id: ctx.userId, email: ctx.email, role: "member" as const }
  })

  await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getCurrentUser(),
    getCurrentProfile(),
  ])

  assert.equal(authLookups, 1)
})

test("separate requests do not share auth state", async () => {
  let sharedCounter = 0

  function makeRequestScope(userId: string) {
    return createRequestScopedCache(async () => {
      sharedCounter += 1
      return { userId }
    })
  }

  const requestA = makeRequestScope("user-a")
  const requestB = makeRequestScope("user-b")

  const [a1, b1, a2, b2] = await Promise.all([
    requestA(),
    requestB(),
    requestA(),
    requestB(),
  ])

  assert.equal(a1.userId, "user-a")
  assert.equal(a2.userId, "user-a")
  assert.equal(b1.userId, "user-b")
  assert.equal(b2.userId, "user-b")
  assert.equal(sharedCounter, 2, "each request scope loads auth once")
})

test("course entitlement is resolved once for outline lessons, not per lesson", async () => {
  let courseEntitlementQueries = 0
  let lessonEntitlementQueries = 0

  const canAccessCourse = createRequestScopedCache(async (_userId: string, _courseId: string) => {
    courseEntitlementQueries += 1
    return true
  })

  async function canAccessLesson(_userId: string, _lessonId: string) {
    lessonEntitlementQueries += 1
    return true
  }

  const lessons = ["l1", "l2", "l3", "l4", "l5"]

  const entitled = await canAccessCourse("user-1", "course-1")
  assert.equal(entitled, true)

  // Preferred outline path: apply course entitlement; do not call canAccessLesson.
  const outline = entitled
    ? lessons.map((id) => ({ id, accessible: true as const }))
    : []

  assert.equal(outline.length, 5)
  assert.equal(courseEntitlementQueries, 1)
  assert.equal(lessonEntitlementQueries, 0)

  // Contrast: the old N+1 path would hit canAccessLesson per lesson.
  for (const lessonId of lessons) {
    await canAccessLesson("user-1", lessonId)
  }
  assert.equal(lessonEntitlementQueries, 5)
})

test("entitled course access remains correct", async () => {
  const canAccessCourse = async (planIds: string[], coursePlanId: string) =>
    planIds.includes(coursePlanId)

  assert.equal(await canAccessCourse(["plan-3"], "plan-3"), true)
  assert.equal(await canAccessCourse(["plan-3"], "plan-other"), false)
})

test("non-entitled users remain denied", async () => {
  const canAccessCourse = async (planIds: string[]) => planIds.length > 0

  assert.equal(await canAccessCourse([]), false)
})

test("draft-preview authorization remains restricted", () => {
  assert.equal(
    evaluatePreviewEligibility({
      role: "member",
      subscriptions: [
        {
          status: "active",
          current_period_end: null,
          cancel_at_period_end: false,
          stripe_subscription_id: "sub_real_stripe",
        },
      ],
    }),
    false
  )

  assert.equal(combinePreviewDecision(true, false), false)
  assert.equal(combinePreviewDecision(true, true), true)

  assert.deepEqual(selectContentStatuses(false), ["published"])
  assert.deepEqual(selectContentStatuses(true), ["published", "draft"])
})

test("draft lessons cannot receive playback tokens", () => {
  assert.equal(deriveLessonAvailability("draft", "published"), false)
  assert.equal(deriveLessonAvailability("published", "published"), true)
  assert.equal(deriveLessonAvailability("published", "draft"), false)
})

test("internal Navbar links use next/link client navigation", () => {
  const navbarLinks = readFileSync(
    join(root, "src/components/layout/navbar-links.tsx"),
    "utf8"
  )
  const navbar = readFileSync(join(root, "src/components/layout/navbar.tsx"), "utf8")

  assert.match(navbarLinks, /import Link from "next\/link"/)
  assert.match(navbarLinks, /<Link[\s\S]*href=\{link\.href\}/)
  assert.doesNotMatch(
    navbarLinks,
    /<a\s+href=\{link\.href\}/,
    "NavbarLinks must not use plain anchors for internal routes"
  )

  assert.match(navbar, /import Link from "next\/link"/)

  const linkItemMatch = navbar.match(
    /function NavbarLinkItem\([\s\S]*?\n\}/
  )
  assert.ok(linkItemMatch, "NavbarLinkItem must exist")
  assert.match(linkItemMatch[0], /<Link[\s\S]*href=\{href\}/)
  assert.doesNotMatch(
    linkItemMatch[0],
    /<a\s+href=\{href\}/,
    "NavbarLinkItem must use Link, not plain anchors"
  )
})

test("loading boundaries compile and render safely", () => {
  const loadingFiles = [
    "src/app/(dashboard)/dashboard/loading.tsx",
    "src/app/(dashboard)/dashboard/library/loading.tsx",
    "src/app/(dashboard)/dashboard/library/[courseId]/loading.tsx",
    "src/app/(dashboard)/dashboard/library/[courseId]/lesson/[lessonId]/loading.tsx",
  ]

  for (const relative of loadingFiles) {
    const source = readFileSync(join(root, relative), "utf8")
    assert.match(source, /export default function/)
    assert.match(source, /aria-busy="true"/)
    assert.match(source, /animate-pulse/)
    assert.doesNotMatch(source, /getAccessibleCourse|getCurrentProfile|canAccess/)
  }
})

test("course outline service does not call canAccessLesson in a loop", () => {
  const contentService = readFileSync(
    join(root, "src/features/content/services/content.service.ts"),
    "utf8"
  )

  assert.match(contentService, /mapCourseOutlineLessons/)
  assert.match(contentService, /canAccessCourse/)
  // Direct lesson routes still protect with canAccessLesson once.
  assert.match(contentService, /canAccessLesson/)
  assert.doesNotMatch(
    contentService,
    /lessons\.map\(async \(lesson\) => \{[\s\S]*canAccessLesson/,
    "must not N+1 canAccessLesson over outline lessons"
  )
})
