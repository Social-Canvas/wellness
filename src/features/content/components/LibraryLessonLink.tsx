import Link from "next/link"

import { Badge } from "@/components/ui"
import { formatDuration } from "@/features/content/utils/format-duration"
import type { LibraryLesson } from "@/features/content/types"

interface LibraryLessonLinkProps {
  courseId: string
  lesson: LibraryLesson
}

export function LibraryLessonLink({ courseId, lesson }: LibraryLessonLinkProps) {
  return (
    <Link
      href={`/dashboard/library/${courseId}/lesson/${lesson.id}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-input)] border border-line bg-surface px-4 py-3 transition-colors hover:border-blue/30 hover:bg-blue-soft/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{lesson.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span>{formatDuration(lesson.durationSeconds)}</span>
          <span aria-hidden="true">·</span>
          <Badge variant="outline">Not completed</Badge>
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
