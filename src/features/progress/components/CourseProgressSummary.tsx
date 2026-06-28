import type { CourseProgress } from "@/features/progress/types"

interface CourseProgressSummaryProps {
  progress: CourseProgress
}

export function CourseProgressSummary({ progress }: CourseProgressSummaryProps) {
  const label =
    progress.totalLessons > 0
      ? `${progress.completedLessons} of ${progress.totalLessons} lessons complete`
      : "No lessons yet"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>Course progress</span>
        <span>{progress.progressPercentage}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-cream2"
        role="progressbar"
        aria-valuenow={progress.progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-blue transition-[width]"
          style={{ width: `${progress.progressPercentage}%` }}
        />
      </div>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  )
}
