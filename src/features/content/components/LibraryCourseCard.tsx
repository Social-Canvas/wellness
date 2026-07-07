import Link from "next/link"

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui"
import { BrandImage } from "@/components/media"
import type { LibraryCourse } from "@/features/content/types"
import { BRAND_IMAGES } from "@/lib/brand/images"

import { LibraryCertificatePlaceholder } from "./LibraryCertificatePlaceholder"
import { LibraryProgressPlaceholder } from "./LibraryProgressPlaceholder"

interface LibraryCourseCardProps {
  course: LibraryCourse
}

export function LibraryCourseCard({ course }: LibraryCourseCardProps) {
  const thumbnail = course.thumbnailUrl
    ? { src: course.thumbnailUrl, alt: `${course.title} course thumbnail` }
    : BRAND_IMAGES.meditationSession

  return (
    <Link
      href={`/dashboard/library/${course.id}`}
      className="group block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full overflow-hidden transition-colors group-hover:border-blue/30 group-hover:bg-blue-soft/20">
        <BrandImage
          image={thumbnail}
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
          <LibraryProgressPlaceholder />
          <Badge variant="secondary">Open course</Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
