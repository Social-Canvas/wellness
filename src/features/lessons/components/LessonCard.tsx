import type { ReactNode } from "react"

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import type { Lesson } from "@/features/lessons/types"

import { LessonStatusBadge, LessonVideoLabel } from "./LessonStatusBadge"
import type { LessonVideoOption } from "./lesson-video-utils"

interface LessonCardProps {
  lesson: Lesson
  videos: LessonVideoOption[]
  actions?: ReactNode
}

export function LessonCard({ lesson, videos, actions }: LessonCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display text-lg font-medium">
            {lesson.title}
          </CardTitle>
          <p className="mt-1 text-sm text-ink-soft">{lesson.slug}</p>
        </div>
        <LessonStatusBadge lesson={lesson} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-soft">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Required
            </p>
            <p className="mt-1 font-medium text-ink">
              {lesson.is_required ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Video
            </p>
            <p className="mt-1">
              <LessonVideoLabel videoId={lesson.video_id} videos={videos} />
            </p>
          </div>
        </div>
        <p>
          <span className="font-semibold text-ink">Sort order:</span> {lesson.sort_order}
        </p>
        <Badge variant={lesson.is_required ? "plan" : "outline"}>
          {lesson.is_required ? "Required" : "Optional"}
        </Badge>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </CardContent>
    </Card>
  )
}
