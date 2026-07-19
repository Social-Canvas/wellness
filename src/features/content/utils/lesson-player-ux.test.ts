import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function read(relative: string): string {
  return readFileSync(join(root, relative), "utf8")
}

test("lesson title renders only once as the page H1", () => {
  const player = read(
    "src/features/content/components/LessonPlayerView.tsx"
  )
  const page = read(
    "src/app/(dashboard)/dashboard/library/[courseId]/lesson/[lessonId]/page.tsx"
  )

  const h1Matches = player.match(/<h1[\s>]/g) ?? []
  assert.equal(h1Matches.length, 1)
  assert.doesNotMatch(player, /CardTitle[\s\S]*lesson\.title/)
  assert.match(page, /LessonPlayerView/)
  assert.doesNotMatch(page, /LibraryLessonDetailView/)
})

test("invalid or missing poster does not render a broken image", () => {
  const player = read("src/features/content/components/SecureMuxPlayer.tsx")
  const tracked = read(
    "src/features/progress/components/ProgressTrackedMuxPlayer.tsx"
  )

  assert.match(player, /resolvePosterUrl/)
  assert.match(player, /\.\.\.\(safePoster \? \{ poster: safePoster \} : \{\}\)/)
  assert.match(tracked, /resolvePosterUrl/)
  assert.doesNotMatch(player, /poster=\{poster \?\? undefined\}/)
})

test("player container uses responsive aspect-ratio behavior", () => {
  const player = read("src/features/content/components/SecureMuxPlayer.tsx")

  assert.match(player, /aspect-video/)
  assert.match(player, /aspectRatio:\s*"16 \/ 9"/)
  assert.match(player, /max-w-4xl/)
  assert.doesNotMatch(player, /h-\[(?:8|9|10)0vh\]/)
})

test("current lesson is highlighted in the outline", () => {
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )

  assert.match(outline, /aria-current=\{isCurrent \? "page" : undefined\}/)
  assert.match(outline, /isCurrent/)
  assert.match(outline, /scrollIntoView/)
})

test("non-entitled users remain denied on lesson and playback paths", () => {
  const contentService = read(
    "src/features/content/services/content.service.ts"
  )
  const playbackRoute = read("src/app/api/mux/playback-token/route.ts")

  assert.match(contentService, /canAccessLesson/)
  assert.match(contentService, /canAccessCourse/)
  assert.match(playbackRoute, /entitlement/)
})

test("signed Mux authorization remains protected", () => {
  const player = read("src/features/content/components/SecureMuxPlayer.tsx")
  const playbackRoute = read("src/app/api/mux/playback-token/route.ts")

  assert.match(player, /\/api\/mux\/playback-token/)
  assert.match(player, /tokens=\{\{ playback: playback\.token \}\}/)
  assert.match(playbackRoute, /createPlaybackToken/)
  assert.doesNotMatch(player, /playback_policy:\s*\[\s*"public"/)
})

test("outline loading does not introduce per-lesson entitlement queries", () => {
  const page = read(
    "src/app/(dashboard)/dashboard/library/[courseId]/lesson/[lessonId]/page.tsx"
  )
  const contentService = read(
    "src/features/content/services/content.service.ts"
  )

  assert.match(page, /getAccessibleCourse/)
  assert.match(page, /buildLessonNavigation/)
  assert.match(
    page,
    /Course entitlement was resolved once in getAccessibleCourse/
  )
  assert.doesNotMatch(
    contentService,
    /lessons\.map\(async \(lesson\) => \{[\s\S]*canAccessLesson/
  )
})

test("mobile course contents can expand and collapse", () => {
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )
  const player = read(
    "src/features/content/components/LessonPlayerView.tsx"
  )

  assert.match(outline, /<details/)
  assert.match(outline, /Course contents/)
  assert.match(outline, /collapsible/)
  assert.match(player, /collapsible/)
  assert.match(player, /lg:hidden/)
})

test("mark complete and continue does not trust client next destination", () => {
  const action = read(
    "src/features/progress/actions/mark-complete-continue.action.ts"
  )
  const schema = read(
    "src/features/progress/schemas/mark-complete-and-continue.ts"
  )

  assert.match(action, /buildLessonNavigation/)
  assert.match(action, /resolveContinueDestination/)
  assert.match(action, /redirect\(destination\)/)
  assert.doesNotMatch(schema, /nextLessonId/)
  assert.match(action, /ignoredNext|nextLessonId/)
})

test("video end does not auto-complete the lesson", () => {
  const tracked = read(
    "src/features/progress/components/ProgressTrackedMuxPlayer.tsx"
  )

  assert.doesNotMatch(tracked, /markVideoCompleteAction/)
  assert.match(tracked, /Do not auto-mark complete/)
  assert.match(tracked, /onEnded\?\.\(\)/)
})
