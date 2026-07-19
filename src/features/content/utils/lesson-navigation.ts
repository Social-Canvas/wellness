import type { LibraryLesson, LibraryModule } from "@/features/content/types"

export type FlatOutlineLesson = LibraryLesson & {
  moduleTitle: string
  moduleSortOrder: number
}

export type AdjacentLessonRef = {
  id: string
  title: string
  moduleTitle: string
  durationSeconds: number | null
}

export type LessonNavigationModel = {
  /** Previous published/available lesson in canonical order, or null. */
  previous: AdjacentLessonRef | null
  /** Next published/available lesson in canonical order, or null. */
  next: AdjacentLessonRef | null
  /** 1-based index among available lessons; 0 when current is unavailable. */
  currentIndex: number
  availableCount: number
  comingSoonCount: number
  completedAvailableCount: number
  /** Flat outline in canonical module/lesson order (may include drafts in preview). */
  outline: FlatOutlineLesson[]
  /** Available (playable) lessons only, canonical order. */
  available: FlatOutlineLesson[]
}

function toAdjacent(lesson: FlatOutlineLesson): AdjacentLessonRef {
  return {
    id: lesson.id,
    title: lesson.title,
    moduleTitle: lesson.moduleTitle,
    durationSeconds: lesson.durationSeconds,
  }
}

/**
 * Flattens modules/lessons into canonical course order.
 * Callers must already have filtered module/lesson statuses for the mode
 * (published-only vs preview including drafts).
 */
export function flattenOutlineLessons(
  modules: LibraryModule[]
): FlatOutlineLesson[] {
  const sortedModules = [...modules].sort((a, b) => a.sortOrder - b.sortOrder)

  const flat: FlatOutlineLesson[] = []

  for (const courseModule of sortedModules) {
    const lessons = [...courseModule.lessons].sort(
      (a, b) => a.sortOrder - b.sortOrder
    )

    for (const lesson of lessons) {
      flat.push({
        ...lesson,
        moduleTitle: courseModule.title,
        moduleSortOrder: courseModule.sortOrder,
      })
    }
  }

  return flat
}

export function getAvailableOutlineLessons(
  outline: FlatOutlineLesson[]
): FlatOutlineLesson[] {
  return outline.filter((lesson) => lesson.isAvailable)
}

/**
 * Builds previous/next destinations from entitled course structure.
 * Navigation targets are always available lessons — drafts are never linked.
 */
export function buildLessonNavigation(
  modules: LibraryModule[],
  currentLessonId: string
): LessonNavigationModel {
  const outline = flattenOutlineLessons(modules)
  const available = getAvailableOutlineLessons(outline)
  const comingSoonCount = outline.filter((lesson) => !lesson.isAvailable).length
  const completedAvailableCount = available.filter(
    (lesson) => lesson.isCompleted
  ).length

  const currentAvailableIndex = available.findIndex(
    (lesson) => lesson.id === currentLessonId
  )

  const previous =
    currentAvailableIndex > 0
      ? toAdjacent(available[currentAvailableIndex - 1]!)
      : null

  const next =
    currentAvailableIndex >= 0 && currentAvailableIndex < available.length - 1
      ? toAdjacent(available[currentAvailableIndex + 1]!)
      : null

  return {
    previous,
    next,
    currentIndex: currentAvailableIndex >= 0 ? currentAvailableIndex + 1 : 0,
    availableCount: available.length,
    comingSoonCount,
    completedAvailableCount,
    outline,
    available,
  }
}

export function resolveLessonHref(
  courseId: string,
  lessonId: string,
  preview: boolean
): string {
  const base = `/dashboard/library/${courseId}/lesson/${lessonId}`
  return preview ? `${base}?preview=1` : base
}

export function resolveCourseHref(courseId: string, preview: boolean): string {
  const base = `/dashboard/library/${courseId}`
  return preview ? `${base}?preview=1` : base
}

/**
 * Server-only destination after marking complete. Never accepts a client
 * next-lesson id — always derived from the navigation model.
 */
export function resolveContinueDestination(input: {
  courseId: string
  preview: boolean
  next: AdjacentLessonRef | null
}): string {
  if (input.next) {
    return resolveLessonHref(input.courseId, input.next.id, input.preview)
  }

  return resolveCourseHref(input.courseId, input.preview)
}
