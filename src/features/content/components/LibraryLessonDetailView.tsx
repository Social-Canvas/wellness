import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { formatDuration } from "@/features/content/utils/format-duration"
import type { LibraryLessonDetail } from "@/features/content/types"
import { cn } from "@/lib/utils"

interface LibraryLessonDetailViewProps {
  lesson: LibraryLessonDetail
}

export function LibraryLessonDetailView({ lesson }: LibraryLessonDetailViewProps) {
  const video = lesson.video

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="font-display text-2xl font-medium">
              {lesson.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {lesson.isRequired ? (
                <Badge variant="plan">Required</Badge>
              ) : (
                <Badge variant="outline">Optional</Badge>
              )}
              <Badge variant="outline">Not completed</Badge>
            </div>
          </div>
          {lesson.description ? (
            <p className="text-sm leading-relaxed text-ink-soft">{lesson.description}</p>
          ) : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-medium">Video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {video ? (
            <>
              <div
                className={cn(
                  "aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-blue-soft to-green-soft",
                  video.thumbnailUrl && "bg-cover bg-center"
                )}
                style={
                  video.thumbnailUrl
                    ? { backgroundImage: `url(${video.thumbnailUrl})` }
                    : undefined
                }
              >
                <div className="flex h-full items-center justify-center bg-ink/10">
                  <p className="rounded-full bg-surface/90 px-4 py-2 text-sm font-medium text-ink-soft">
                    Playback coming soon
                  </p>
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Video title
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{video.title}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Duration
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-ink">
                    {formatDuration(video.durationSeconds)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Mux playback ID
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-ink-soft">
                    {video.muxPlaybackId ?? "Not set"}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-ink-soft">No video attached to this lesson yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
