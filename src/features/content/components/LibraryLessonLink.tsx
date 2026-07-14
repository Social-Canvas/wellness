import Link from "next/link"

import { Badge } from "@/components/ui"
import { formatDuration } from "@/features/content/utils/format-duration"
import type { LibraryLesson } from "@/features/content/types"
import { LessonCompletionBadge } from "@/features/progress/components"

interface LibraryLessonLinkProps {
  courseId: string
  lesson: LibraryLesson
  preview?: boolean
}

export function LibraryLessonLink({
  courseId,
  lesson,
  preview = false,
}: LibraryLessonLinkProps) {
  // Draft lessons only ever appear inside an authorized preview. They are not
  // openable: no playback route, no completion, and visually distinct.
  if (!lesson.isAvailable) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-input)] border border-dashed border-line bg-cream2/40 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink-soft">{lesson.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <Badge variant="outline">Coming soon</Badge>
            <span aria-hidden="true">·</span>
            <span>Media not available yet</span>
          </div>
        </div>
        <span className="text-sm font-medium text-ink-soft">Coming soon</span>
      </div>
    )
  }

  return (
    <Link
      href={
        preview
          ? `/dashboard/library/${courseId}/lesson/${lesson.id}?preview=1`
          : `/dashboard/library/${courseId}/lesson/${lesson.id}`
      }
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-input)] border border-line bg-surface px-4 py-3 transition-colors hover:border-blue/30 hover:bg-blue-soft/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{lesson.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span>{formatDuration(lesson.durationSeconds)}</span>
          <span aria-hidden="true">·</span>
          <LessonCompletionBadge isCompleted={lesson.isCompleted} />
          {lesson.hasVideo ? (
            <Badge variant="secondary">Video attached</Badge>
          ) : (
            <Badge variant="outline">No video</Badge>
          )}
        </div>
      </div>
      <span className="text-sm font-semibold text-blue">Open</span>
    </Link>
  )
}
