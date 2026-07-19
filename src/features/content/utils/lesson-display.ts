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
