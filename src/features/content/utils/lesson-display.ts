/**
 * Derives a single page headline from stored lesson + module titles.
 * Reset lessons are stored as "Day 1: Morning Meditation"; the module already
 * carries "Day 1", so the H1 should be the short lesson name only.
 */
export function deriveLessonHeadline(
  lessonTitle: string,
  moduleTitle: string
): string {
  const prefix = `${moduleTitle}: `
  if (lessonTitle.startsWith(prefix)) {
    const remainder = lessonTitle.slice(prefix.length).trim()
    return remainder.length > 0 ? remainder : lessonTitle
  }

  return lessonTitle
}

/** Concise outline title when the module heading already provides day/context. */
export function deriveOutlineLessonTitle(
  lessonTitle: string,
  moduleTitle: string
): string {
  return deriveLessonHeadline(lessonTitle, moduleTitle)
}

export function buildLessonContextLine(input: {
  moduleTitle: string
  currentIndex: number
  availableCount: number
  isAvailable: boolean
}): string {
  if (!input.isAvailable || input.currentIndex < 1 || input.availableCount < 1) {
    return input.moduleTitle
  }

  return `${input.moduleTitle} · Lesson ${input.currentIndex} of ${input.availableCount} available`
}

/**
 * Show Required only when the course mixes required and optional lessons.
 * When every lesson is required, the label adds no useful distinction.
 */
export function shouldShowRequiredLabel(
  lessons: Array<{ isRequired: boolean }>,
  currentIsRequired: boolean
): boolean {
  if (!currentIsRequired) {
    return false
  }

  return lessons.some((lesson) => !lesson.isRequired)
}

export function buildModuleProgressSummary(lessons: Array<{
  isAvailable: boolean
  isCompleted: boolean
}>): string {
  const available = lessons.filter((lesson) => lesson.isAvailable)
  const completedCount = available.filter((lesson) => lesson.isCompleted).length

  if (available.length === 0) {
    return "Coming soon"
  }

  if (completedCount === 0) {
    return `${available.length} available`
  }

  return `${completedCount}/${available.length} complete`
}

export function availableProgressPercent(
  completedAvailableCount: number,
  availableCount: number
): number {
  if (availableCount <= 0) {
    return 0
  }

  return Math.min(
    100,
    Math.round((completedAvailableCount / availableCount) * 100)
  )
}
