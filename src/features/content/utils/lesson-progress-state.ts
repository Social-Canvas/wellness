/**
 * Lesson row completion must come from the current user's progress record only.
 * Never infer from publication, availability, or missing video joins.
 */

export type LessonProgressState = "not_started" | "in_progress" | "completed"

export type LessonProgressSignals = {
  completedAt?: string | null
  lastPositionSeconds?: number | null
  watchedSeconds?: number | null
}

export function deriveLessonProgressState(
  progress: LessonProgressSignals | null | undefined
): LessonProgressState {
  if (progress?.completedAt) {
    return "completed"
  }

  const lastPosition = progress?.lastPositionSeconds ?? 0
  const watched = progress?.watchedSeconds ?? 0

  if (lastPosition > 0 || watched > 0) {
    return "in_progress"
  }

  return "not_started"
}

export function isLessonCompletedFromProgress(
  progress: LessonProgressSignals | null | undefined
): boolean {
  return deriveLessonProgressState(progress) === "completed"
}

export function lessonProgressLabel(state: LessonProgressState): string {
  switch (state) {
    case "completed":
      return "Completed"
    case "in_progress":
      return "In progress"
    case "not_started":
      return "Not started"
  }
}

export function lessonProgressCta(state: LessonProgressState): string {
  switch (state) {
    case "completed":
      return "Review"
    case "in_progress":
      return "Continue"
    case "not_started":
      return "Start"
  }
}

/** Same readiness signal for list badges and the protected player. */
export function lessonHasPlayableVideo(
  video: { muxPlaybackId?: string | null; mux_playback_id?: string | null } | null | undefined
): boolean {
  if (!video) {
    return false
  }

  const playbackId = video.muxPlaybackId ?? video.mux_playback_id
  return typeof playbackId === "string" && playbackId.trim().length > 0
}

/**
 * Count completed lessons from progress only. Lessons without a video are
 * incomplete (not auto-complete).
 */
export function countCompletedLessons(
  lessons: Array<{ videoId: string | null | undefined }>,
  completedVideoIds: ReadonlySet<string>
): { completed: number; total: number } {
  let completed = 0

  for (const lesson of lessons) {
    if (lesson.videoId && completedVideoIds.has(lesson.videoId)) {
      completed += 1
    }
  }

  return { completed, total: lessons.length }
}
