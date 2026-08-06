import Link from "next/link"

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui"
import { MediaThumbnail } from "@/components/media"
import type { LibraryCourse } from "@/features/content/types"
import type { LibraryCourseCardProgressView } from "@/features/content/utils/library-course-card-progress"

import { LibraryCertificatePlaceholder } from "./LibraryCertificatePlaceholder"

interface LibraryCourseCardProps {
  course: LibraryCourse
  progress: LibraryCourseCardProgressView
}

export function LibraryCourseCard({ course, progress }: LibraryCourseCardProps) {
  const card = (
    <Card className="h-full overflow-hidden transition-colors group-hover:border-blue/30 group-hover:bg-blue-soft/20">
      <MediaThumbnail
        media={{ thumbnailUrl: course.thumbnailUrl }}
        alt={`${course.title} course thumbnail`}
        title={course.title}
        containerClassName="aspect-[16/9] w-full border-b border-line"
        sizes="(max-width: 860px) 100vw, 33vw"
      />
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="font-display text-xl font-medium group-hover:text-blue-deep">
            {course.title}
          </CardTitle>
          <LibraryCertificatePlaceholder enabled={course.certificateEnabled} />
        </div>
        {course.description ? (
          <CardDescription className="line-clamp-2">{course.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span>Progress</span>
            <span>{progress.progressLabel}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-cream2"
            role="progressbar"
            aria-valuenow={progress.progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progress.progressLabel}
          >
            <div
              className="h-full rounded-full bg-blue transition-[width]"
              style={{ width: `${progress.progressPercentage}%` }}
            />
          </div>
        </div>
        {progress.ctaLabel ? (
          <Badge variant="secondary">{progress.ctaLabel}</Badge>
        ) : (
          <Badge variant="outline">{progress.progressLabel}</Badge>
        )}
      </CardContent>
    </Card>
  )

  if (!progress.href) {
    return <div className="block">{card}</div>
  }

  return (
    <Link
      href={progress.href}
      className="group block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {card}
    </Link>
  )
}
