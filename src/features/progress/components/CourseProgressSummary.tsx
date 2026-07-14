import type { CourseProgress } from "@/features/progress/types"

interface CourseProgressSummaryProps {
  progress: CourseProgress
  /** In preview: number of draft lessons not yet available. */
  comingSoonCount?: number
  preview?: boolean
}

export function CourseProgressSummary({
  progress,
  comingSoonCount = 0,
  preview = false,
}: CourseProgressSummaryProps) {
  // Progress is always computed over published lessons only, so draft lessons
  // never reduce completion. In preview we make the "available" framing explicit
  // and surface how many lessons are still coming soon.
  const baseLabel =
    progress.totalLessons > 0
      ? preview
        ? `${progress.completedLessons} of ${progress.totalLessons} available lessons complete`
        : `${progress.completedLessons} of ${progress.totalLessons} lessons complete`
      : preview
        ? "No available lessons yet"
        : "No lessons yet"

  const label =
    preview && comingSoonCount > 0
      ? `${baseLabel} · ${comingSoonCount} ${comingSoonCount === 1 ? "lesson" : "lessons"} coming soon`
      : baseLabel

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
