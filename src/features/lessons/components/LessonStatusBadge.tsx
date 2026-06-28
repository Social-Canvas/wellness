import { Badge } from "@/components/ui"
import type { Lesson } from "@/features/lessons/types"

import type { LessonVideoOption } from "./lesson-video-utils"
import { getVideoTitleForLesson } from "./lesson-video-utils"

interface LessonStatusBadgeProps {
  lesson: Pick<Lesson, "status">
}

export function LessonStatusBadge({ lesson }: LessonStatusBadgeProps) {
  if (lesson.status === "published") {
    return <Badge variant="plan">Published</Badge>
  }

  if (lesson.status === "archived") {
    return <Badge variant="outline">Archived</Badge>
  }

  return <Badge variant="secondary">Draft</Badge>
}

export function LessonVideoLabel({
  videoId,
  videos,
}: {
  videoId: string | null
  videos: LessonVideoOption[]
}) {
  if (!videoId) {
    return <span className="text-ink-soft">No video attached</span>
  }

  const title = getVideoTitleForLesson(videoId, videos)

  if (title) {
    return <span className="text-ink">{title}</span>
  }

  return <span className="text-ink-soft">Unknown video</span>
}
