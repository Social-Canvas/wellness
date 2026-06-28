import type { VideoProgress } from "@/features/progress/types"

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
}

export type LibraryModule = {
  id: string
  courseId: string
  title: string
  slug: string
  description: string | null
  sortOrder: number
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
  course: Pick<LibraryCourse, "id" | "title" | "slug">
  module: Pick<LibraryModule, "id" | "title" | "slug">
}
