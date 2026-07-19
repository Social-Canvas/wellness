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

test("completed status is not repeated across main content locations", () => {
  const player = read(
    "src/features/content/components/LessonPlayerView.tsx"
  )
  const controls = read(
    "src/features/content/components/LessonNavigationControls.tsx"
  )
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )

  assert.match(player, /data-lesson-status="completed"/)
  assert.match(player, /data-lesson-duration/)
  assert.match(
    player,
    /data-lesson-duration\s*>\s*\n\s*Duration \{formatDuration\(video\.durationSeconds\)\}\s*\n\s*<\/p>/
  )
  assert.doesNotMatch(controls, /role="status"[\s\S]*Completed/)
  assert.doesNotMatch(controls, />\s*Completed\s*</)
  // Outline may keep checkmarks, but not a textual Completed label.
  assert.doesNotMatch(outline, />Completed</)
})

test("incomplete lesson shows Mark complete & continue", () => {
  const controls = read(
    "src/features/content/components/LessonNavigationControls.tsx"
  )

  assert.match(controls, /Mark complete & continue/)
  assert.match(controls, /Mark complete & finish/)
})

test("completed lesson shows Continue to next lesson", () => {
  const controls = read(
    "src/features/content/components/LessonNavigationControls.tsx"
  )

  assert.match(controls, /Continue to next lesson/)
  assert.match(controls, /Return to course overview/)
})

test("primary CTA and navigation row do not create duplicate large Next actions", () => {
  const controls = read(
    "src/features/content/components/LessonNavigationControls.tsx"
  )

  assert.match(controls, /data-primary-action/)
  assert.match(controls, /data-adjacent-nav/)
  assert.match(controls, /← Previous/)
  assert.match(controls, /Next →/)
  // Adjacent nav stays compact text links, not block-sized next CTAs.
  assert.doesNotMatch(
    controls,
    /data-adjacent-nav[\s\S]*buttonVariants\(\{\s*variant:\s*"default",\s*size:\s*"block"/
  )
  assert.match(controls, /data-up-next/)
})

test("previous and next navigation remain server-derived", () => {
  const action = read(
    "src/features/progress/actions/mark-complete-continue.action.ts"
  )
  const navigation = read(
    "src/features/content/utils/lesson-navigation.ts"
  )

  assert.match(action, /buildLessonNavigation/)
  assert.match(action, /resolveContinueDestination/)
  assert.match(navigation, /Never accepts a client/)
  assert.doesNotMatch(action, /formData\.get\("nextHref"\)/)
})

test("current module is expanded initially and others collapse", () => {
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )

  assert.match(outline, /defaultOpen=\{module\.id === currentModuleId\}/)
  assert.match(outline, /aria-expanded=\{open\}/)
  assert.match(outline, /ModuleAccordion/)
})

test("module accordion is keyboard accessible", () => {
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )

  assert.match(outline, /type="button"/)
  assert.match(outline, /aria-expanded/)
  assert.match(outline, /aria-controls/)
})

test("sidebar progress bar uses available lesson counts", () => {
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )
  const display = read("src/features/content/utils/lesson-display.ts")

  assert.match(outline, /role="progressbar"/)
  assert.match(outline, /data-available-count=\{availableCount\}/)
  assert.match(
    outline,
    /data-completed-available-count=\{completedAvailableCount\}/
  )
  assert.match(outline, /availableProgressPercent/)
  assert.match(display, /availableProgressPercent/)
  assert.match(
    outline,
    /of \$\{availableCount\} available lessons complete/
  )
})

test("coming-soon count remains separate in preview", () => {
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )

  assert.match(outline, /comingSoonCount > 0/)
  assert.match(outline, /coming soon/)
  assert.match(outline, /preview && comingSoonCount/)
})

test("current outline item uses aria-current", () => {
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )

  assert.match(outline, /aria-current=\{isCurrent \? "page" : undefined\}/)
  assert.match(outline, /scrollIntoView/)
})

test("outline uses concise titles while accessible labels retain full context", () => {
  const outline = read(
    "src/features/content/components/LessonCourseOutline.tsx"
  )
  const display = read("src/features/content/utils/lesson-display.ts")

  assert.match(outline, /deriveOutlineLessonTitle/)
  assert.match(outline, /aria-label=\{accessibleLabel\}/)
  assert.match(outline, /lesson\.title/)
  assert.match(display, /deriveOutlineLessonTitle/)
})

test("mobile sticky action renders only at the intended breakpoint", () => {
  const controls = read(
    "src/features/content/components/LessonNavigationControls.tsx"
  )

  assert.match(controls, /data-mobile-sticky-action/)
  assert.match(controls, /lg:hidden/)
  assert.match(controls, /fixed inset-x-0 bottom-0/)
})

test("sticky action does not duplicate the desktop inline primary action", () => {
  const controls = read(
    "src/features/content/components/LessonNavigationControls.tsx"
  )
  const player = read(
    "src/features/content/components/LessonPlayerView.tsx"
  )

  assert.match(controls, /className="hidden lg:block"/)
  assert.match(controls, /data-mobile-sticky-action/)
  assert.match(player, /max-lg:pb-28/)
})

test("final available lesson has correct completion destination", () => {
  const navigation = read(
    "src/features/content/utils/lesson-navigation.ts"
  )
  const controls = read(
    "src/features/content/components/LessonNavigationControls.tsx"
  )

  assert.match(navigation, /resolveCourseHref\(input\.courseId, input\.preview\)/)
  assert.match(controls, /Return to course overview/)
  assert.match(controls, /Mark complete & finish/)
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
  const view = read(
    "src/features/content/components/LessonPlayerView.tsx"
  )

  assert.match(player, /aspect-video/)
  assert.match(player, /aspectRatio:\s*"16 \/ 9"/)
  assert.match(view, /max-w-3xl/)
  assert.match(view, /max-w-6xl/)
  assert.doesNotMatch(player, /h-\[(?:8|9|10)0vh\]/)
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

test("Required badge is suppressed when every lesson is required", () => {
  const player = read(
    "src/features/content/components/LessonPlayerView.tsx"
  )
  const display = read("src/features/content/utils/lesson-display.ts")

  assert.match(player, /shouldShowRequiredLabel/)
  assert.match(display, /shouldShowRequiredLabel/)
})
