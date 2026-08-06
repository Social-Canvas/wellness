import { DownloadCourseResourceButton } from "@/features/content/components/DownloadCourseResourceButton"
import type { CourseResourceListItem } from "@/features/content/services/course-resources.service"

interface CourseResourcesSectionProps {
  courseId: string
  resources: CourseResourceListItem[]
}

function formatBytes(size: number | null): string | null {
  if (size == null || size <= 0) return null
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function CourseResourcesSection({
  courseId,
  resources,
}: CourseResourcesSectionProps) {
  if (resources.length === 0) {
    return null
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface px-5 py-6 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-medium text-ink">Resources</h2>
        <p className="text-sm text-ink-soft">
          Downloadable materials for this course. Available only while you have
          access.
        </p>
      </div>
      <ul className="divide-y divide-line">
        {resources.map((resource) => {
          const sizeLabel = formatBytes(resource.sizeBytes)
          return (
            <li
              key={resource.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-ink">{resource.title}</p>
                {resource.description ? (
                  <p className="text-sm text-ink-soft">{resource.description}</p>
                ) : null}
                <p className="text-xs text-ink-soft">
                  {resource.fileName}
                  {sizeLabel ? ` · ${sizeLabel}` : ""}
                </p>
              </div>
              <DownloadCourseResourceButton
                courseId={courseId}
                resourceId={resource.id}
                fileName={resource.fileName}
                label="Download"
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
