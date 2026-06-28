import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import type { LibraryModule } from "@/features/content/types"

import { LibraryLessonLink } from "./LibraryLessonLink"

interface LibraryModuleListProps {
  courseId: string
  modules: LibraryModule[]
}

export function LibraryModuleList({ courseId, modules }: LibraryModuleListProps) {
  if (modules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
        <p className="font-display text-lg font-medium text-ink">No modules yet</p>
        <p className="mt-2 text-sm text-ink-soft">
          Published modules for this course will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {modules.map((module) => (
        <Card key={module.id}>
          <CardHeader>
            <CardTitle className="font-display text-xl font-medium">
              {module.title}
            </CardTitle>
            {module.description ? (
              <p className="text-sm text-ink-soft">{module.description}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {module.lessons.length === 0 ? (
              <p className="text-sm text-ink-soft">No published lessons in this module.</p>
            ) : (
              module.lessons.map((lesson) => (
                <LibraryLessonLink
                  key={lesson.id}
                  courseId={courseId}
                  lesson={lesson}
                />
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
