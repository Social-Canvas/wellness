export type VideoProgress = {
  videoId: string
  lessonId: string | null
  lastPositionSeconds: number
  watchedSeconds: number
  progressPercentage: number
  completedAt: string | null
}

export type CourseProgress = {
  courseId: string
  progressPercentage: number
  completedLessons: number
  totalLessons: number
  completedAt: string | null
}

/** Read-only library-card snapshot — never writes course_progress. */
export type LibraryCourseProgressSnapshot = {
  courseId: string
  progressPercentage: number
  completedLessons: number
  totalLessons: number
}
