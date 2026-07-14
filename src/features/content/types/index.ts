import type { VideoProgress } from "@/features/progress/types"

/**
 * Publication states surfaced to the library UI. Drafts are only ever included
 * when an authorized preview is active; ordinary members never receive them.
 */
export type LibraryContentStatus = "published" | "draft"

export type LibraryVideoSummary = {
  id: string
  title: string
  durationSeconds: number | null
  thumbnailUrl: string | null
  muxPlaybackId: string | null
}

export type LibraryLesson = {
  id: string
  moduleId: string
  title: string
  slug: string
  sortOrder: number
  isRequired: boolean
  videoId: string | null
  hasVideo: boolean
  durationSeconds: number | null
  isCompleted: boolean
  status: LibraryContentStatus
  /**
   * True only when the lesson is fully published and openable for playback.
   * Draft lessons shown in preview are never available (no player, no token).
   */
  isAvailable: boolean
}

export type LibraryModule = {
  id: string
  courseId: string
  title: string
  slug: string
  description: string | null
  sortOrder: number
  status: LibraryContentStatus
  lessons: LibraryLesson[]
}

export type LibraryCourse = {
  id: string
  slug: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  certificateEnabled: boolean
  sortOrder: number
}

export type LibraryCourseDetail = LibraryCourse & {
  /** True when the caller is viewing an authorized draft-content preview. */
  preview: boolean
  modules: LibraryModule[]
}

export type LibraryLessonDetail = {
  id: string
  moduleId: string
  courseId: string
  title: string
  slug: string
  description: string | null
  sortOrder: number
  isRequired: boolean
  video: LibraryVideoSummary | null
  videoProgress: VideoProgress | null
  isCompleted: boolean
  status: LibraryContentStatus
  /**
   * True only for fully published lessons. Draft lessons surfaced in preview
   * render a "coming soon" view with no player, token, or completion.
   */
  isAvailable: boolean
  /** True when the caller is viewing an authorized draft-content preview. */
  preview: boolean
  course: Pick<LibraryCourse, "id" | "title" | "slug">
  module: Pick<LibraryModule, "id" | "title" | "slug">
}
