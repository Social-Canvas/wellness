"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { Check } from "lucide-react"

import { Badge } from "@/components/ui"
import { formatDuration } from "@/features/content/utils/format-duration"
import {
  resolveLessonHref,
  type FlatOutlineLesson,
} from "@/features/content/utils/lesson-navigation"
import { cn } from "@/lib/utils"

interface LessonCourseOutlineProps {
  courseId: string
  courseTitle: string
  modules: Array<{
    id: string
    title: string
    lessons: FlatOutlineLesson[]
  }>
  currentLessonId: string
  preview: boolean
  availableCount: number
  completedAvailableCount: number
  comingSoonCount: number
  /** When true, render as a collapsible details block (mobile). */
  collapsible?: boolean
}

function OutlineLessonRow({
  courseId,
  lesson,
  preview,
  isCurrent,
}: {
  courseId: string
  lesson: FlatOutlineLesson
  preview: boolean
  isCurrent: boolean
}) {
  const rowRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (isCurrent && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [isCurrent])

  if (!lesson.isAvailable) {
    return (
      <li ref={rowRef}>
        <div
          className="flex items-start gap-2 rounded-[var(--radius-input)] px-2.5 py-2 text-sm text-ink-soft"
          aria-disabled="true"
        >
          <span
            className="mt-0.5 size-4 shrink-0 rounded-full border border-dashed border-line"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block leading-snug">{lesson.title}</span>
            <span className="mt-0.5 block text-xs">Coming soon</span>
          </span>
        </div>
      </li>
    )
  }

  return (
    <li ref={rowRef}>
      <Link
        href={resolveLessonHref(courseId, lesson.id, preview)}
        aria-current={isCurrent ? "page" : undefined}
        className={cn(
          "flex items-start gap-2 rounded-[var(--radius-input)] px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          isCurrent
            ? "bg-blue-soft/40 font-semibold text-ink"
            : "text-ink hover:bg-cream2"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
            lesson.isCompleted
              ? "border-green bg-green text-white"
              : "border-line bg-surface"
          )}
          aria-hidden="true"
        >
          {lesson.isCompleted ? <Check className="size-2.5" strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block leading-snug">{lesson.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-normal text-ink-soft">
            {lesson.isCompleted ? <span>Completed</span> : null}
            {lesson.durationSeconds != null ? (
              <>
                {lesson.isCompleted ? <span aria-hidden="true">·</span> : null}
                <span>{formatDuration(lesson.durationSeconds)}</span>
              </>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  )
}

function OutlineBody({
  courseId,
  courseTitle,
  modules,
  currentLessonId,
  preview,
  availableCount,
  completedAvailableCount,
  comingSoonCount,
}: Omit<LessonCourseOutlineProps, "collapsible">) {
  const progressLabel =
    availableCount > 0
      ? `${completedAvailableCount} of ${availableCount} available lessons complete`
      : "No available lessons yet"

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-display text-base font-medium text-ink">{courseTitle}</p>
        <p className="text-xs text-ink-soft">{progressLabel}</p>
        {preview && comingSoonCount > 0 ? (
          <p className="text-xs text-ink-soft">
            {comingSoonCount} {comingSoonCount === 1 ? "lesson" : "lessons"} coming
            soon
          </p>
        ) : null}
        {preview ? (
          <Badge variant="outline" className="mt-1">
            Preview
          </Badge>
        ) : null}
      </div>

      <nav aria-label="Course contents" className="space-y-4">
        {modules.map((module) => (
          <div key={module.id} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {module.title}
            </p>
            <ol className="space-y-0.5">
              {module.lessons.map((lesson) => (
                <OutlineLessonRow
                  key={lesson.id}
                  courseId={courseId}
                  lesson={lesson}
                  preview={preview}
                  isCurrent={lesson.id === currentLessonId}
                />
              ))}
            </ol>
          </div>
        ))}
      </nav>
    </div>
  )
}

export function LessonCourseOutline(props: LessonCourseOutlineProps) {
  const { collapsible = false, ...bodyProps } = props

  if (collapsible) {
    return (
      <details className="group rounded-2xl border border-line bg-surface open:pb-4">
        <summary className="cursor-pointer list-none px-4 py-3 font-display text-base font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-3">
            <span>Course contents</span>
            <span className="text-sm font-body font-normal text-ink-soft group-open:hidden">
              Show
            </span>
            <span className="hidden text-sm font-body font-normal text-ink-soft group-open:inline">
              Hide
            </span>
          </span>
        </summary>
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-4 pt-1">
          <OutlineBody {...bodyProps} />
        </div>
      </details>
    )
  }

  return (
    <aside
      className="rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
      aria-label="Course outline"
    >
      <OutlineBody {...bodyProps} />
    </aside>
  )
}
