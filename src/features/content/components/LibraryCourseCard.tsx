import Link from "next/link"

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui"
import type { LibraryCourse } from "@/features/content/types"
import { cn } from "@/lib/utils"

import { LibraryCertificatePlaceholder } from "./LibraryCertificatePlaceholder"
import { LibraryProgressPlaceholder } from "./LibraryProgressPlaceholder"

interface LibraryCourseCardProps {
  course: LibraryCourse
}

export function LibraryCourseCard({ course }: LibraryCourseCardProps) {
  return (
    <Link
      href={`/dashboard/library/${course.id}`}
      className="group block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors group-hover:border-blue/30 group-hover:bg-blue-soft/20">
        <div
          className={cn(
            "aspect-[16/9] border-b border-line bg-gradient-to-br from-blue-soft to-green-soft",
            course.thumbnailUrl && "bg-cover bg-center"
          )}
          style={
            course.thumbnailUrl
              ? { backgroundImage: `url(${course.thumbnailUrl})` }
              : undefined
          }
          aria-hidden="true"
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
