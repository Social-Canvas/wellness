import { Badge } from "@/components/ui"
import { cn } from "@/lib/utils"
import type { LessonProgressState } from "@/features/content/utils/lesson-progress-state"
import {
  deriveLessonProgressState,
  lessonProgressLabel,
} from "@/features/content/utils/lesson-progress-state"

interface LessonCompletionBadgeProps {
  isCompleted?: boolean
  progressState?: LessonProgressState
  className?: string
}

export function LessonCompletionBadge({
  isCompleted,
  progressState,
  className,
}: LessonCompletionBadgeProps) {
  const state =
    progressState ??
    deriveLessonProgressState(
      isCompleted ? { completedAt: "completed" } : null
    )

  // Zero-progress users must never see a Completed badge.
  if (state === "not_started") {
    return (
      <Badge variant="outline" className={cn(className)}>
        {lessonProgressLabel(state)}
      </Badge>
    )
  }

  if (state === "in_progress") {
    return (
      <Badge variant="outline" className={cn(className)}>
        {lessonProgressLabel(state)}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className={cn(className)}>
      {lessonProgressLabel(state)}
    </Badge>
  )
}
