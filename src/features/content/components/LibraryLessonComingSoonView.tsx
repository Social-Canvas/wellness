import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import type { LibraryLessonDetail } from "@/features/content/types"

interface LibraryLessonComingSoonViewProps {
  lesson: LibraryLessonDetail
}

/**
 * Preview-only view for a draft lesson. Renders no player, requests no playback
 * token, and offers no completion — it exists solely to preview course
 * structure. Ordinary members never reach this view (they get not-found).
 */
export function LibraryLessonComingSoonView({
  lesson,
}: LibraryLessonComingSoonViewProps) {
  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="font-display text-2xl font-medium text-ink-soft">
              {lesson.title}
            </CardTitle>
            <Badge variant="outline">Coming soon</Badge>
          </div>
          {lesson.description ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              {lesson.description}
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="rounded-[var(--radius-input)] border border-dashed border-line bg-cream2/40 px-6 py-10 text-center">
            <p className="font-display text-lg font-medium text-ink">
              Media not available yet
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              This lesson is still in draft. Video playback will be enabled once the
              lesson is published.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
