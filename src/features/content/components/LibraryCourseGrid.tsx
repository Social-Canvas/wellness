import type { LibraryCourse } from "@/features/content/types"
import type { LibraryCourseCardProgressView } from "@/features/content/utils/library-course-card-progress"

import { LibraryCourseCard } from "./LibraryCourseCard"

interface LibraryCourseGridProps {
  courses: LibraryCourse[]
  progressByCourseId: Record<string, LibraryCourseCardProgressView>
}

export function LibraryCourseGrid({
  courses,
  progressByCourseId,
}: LibraryCourseGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => {
        const progress = progressByCourseId[course.id]
        if (!progress) {
          return null
        }

        return (
          <LibraryCourseCard
            key={course.id}
            course={course}
            progress={progress}
          />
        )
      })}
    </div>
  )
}
