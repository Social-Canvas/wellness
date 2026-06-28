import type { Video } from "@/features/videos/types"

export type LessonVideoOption = Pick<Video, "id" | "title">

export function getVideoTitleForLesson(
  videoId: string | null,
  videos: LessonVideoOption[]
): string | null {
  if (!videoId) {
    return null
  }

  return videos.find((video) => video.id === videoId)?.title ?? null
}
