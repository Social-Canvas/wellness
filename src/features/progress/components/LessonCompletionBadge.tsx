import { Badge } from "@/components/ui"
import { cn } from "@/lib/utils"

interface LessonCompletionBadgeProps {
  isCompleted: boolean
  className?: string
}

export function LessonCompletionBadge({
  isCompleted,
  className,
}: LessonCompletionBadgeProps) {
  return (
    <Badge variant={isCompleted ? "secondary" : "outline"} className={cn(className)}>
      {isCompleted ? "Completed" : "Not completed"}
    </Badge>
  )
}
