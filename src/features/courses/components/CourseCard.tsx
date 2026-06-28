import type { ReactNode } from "react"

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import type { CourseWithPlanAccess } from "@/features/courses/types"

import { CourseStatusBadge } from "./CourseStatusBadge"

interface CourseCardProps {
  course: CourseWithPlanAccess
  actions?: ReactNode
}

export function CourseCard({ course, actions }: CourseCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display text-lg font-medium">
            {course.title}
          </CardTitle>
          <p className="mt-1 text-sm text-ink-soft">{course.slug}</p>
        </div>
        <CourseStatusBadge course={course} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-soft">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Certificate
            </p>
            <p className="mt-1 font-medium text-ink">
              {course.certificate_enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Completion
            </p>
            <p className="mt-1 font-medium text-ink">
              {course.completion_threshold}%
            </p>
          </div>
        </div>
        <p>
          <span className="font-semibold text-ink">Sort order:</span>{" "}
          {course.sort_order}
        </p>
        {course.planAccess.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {course.planAccess.map((access) => (
              <Badge key={access.id} variant="outline">
                {access.planName}
              </Badge>
            ))}
          </div>
        ) : null}
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </CardContent>
    </Card>
  )
}
