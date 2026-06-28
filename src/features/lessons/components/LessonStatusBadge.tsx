import { Badge } from "@/components/ui"
import type { Lesson } from "@/features/lessons/types"

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

function formatVideoId(videoId: string | null): string {
  if (!videoId) {
    return "—"
  }

  return videoId
}

export function LessonVideoLabel({ videoId }: { videoId: string | null }) {
  const label = formatVideoId(videoId)

  if (label === "—") {
    return <span className="text-ink-soft">—</span>
  }

  return (
    <span className="font-mono text-xs text-ink-soft" title={label}>
      {label.slice(0, 8)}…
    </span>
  )
}
