import { Badge } from "@/components/ui"
import type { Course } from "@/features/courses/types"

interface CourseStatusBadgeProps {
  course: Pick<Course, "status">
}

export function CourseStatusBadge({ course }: CourseStatusBadgeProps) {
  if (course.status === "published") {
    return <Badge variant="plan">Published</Badge>
  }

  if (course.status === "archived") {
    return <Badge variant="outline">Archived</Badge>
  }

  return <Badge variant="secondary">Draft</Badge>
}
