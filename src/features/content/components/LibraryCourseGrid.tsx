import type { LibraryCourse } from "@/features/content/types"

import { LibraryCourseCard } from "./LibraryCourseCard"

interface LibraryCourseGridProps {
  courses: LibraryCourse[]
}

export function LibraryCourseGrid({ courses }: LibraryCourseGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <LibraryCourseCard key={course.id} course={course} />
      ))}
    </div>
  )
}
