"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui"
import { formatDuration } from "@/features/content/utils/format-duration"
import {
  availableProgressPercent,
  buildModuleProgressSummary,
  deriveOutlineLessonTitle,
} from "@/features/content/utils/lesson-display"
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
  const conciseTitle = deriveOutlineLessonTitle(lesson.title, lesson.moduleTitle)
  const durationLabel =
    lesson.durationSeconds != null
      ? formatDuration(lesson.durationSeconds)
      : null

  useEffect(() => {
    if (isCurrent && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [isCurrent])

  if (!lesson.isAvailable) {
    return (
      <li ref={rowRef}>
        <div
          className="flex items-center gap-2 rounded-[var(--radius-input)] px-2 py-1.5 text-sm text-ink-soft"
          aria-disabled="true"
          aria-label={`${lesson.title}, coming soon`}
        >
          <span
            className="size-3.5 shrink-0 rounded-full border border-dashed border-line"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate leading-snug">
            {conciseTitle}
          </span>
          <span className="shrink-0 text-xs">Soon</span>
        </div>
      </li>
    )
  }

  const accessibleLabel = [
    lesson.title,
    lesson.isCompleted ? "completed" : null,
    durationLabel,
    isCurrent ? "current lesson" : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <li ref={rowRef}>
      <Link
        href={resolveLessonHref(courseId, lesson.id, preview)}
        aria-current={isCurrent ? "page" : undefined}
        aria-label={accessibleLabel}
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-input)] px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          isCurrent
            ? "bg-blue-soft/40 font-semibold text-ink"
            : "text-ink hover:bg-cream2"
        )}
      >
        <span
          className={cn(
            "flex size-3.5 shrink-0 items-center justify-center rounded-full border",
            lesson.isCompleted
              ? "border-green bg-green text-white"
              : "border-line bg-surface"
          )}
          aria-hidden="true"
        >
          {lesson.isCompleted ? (
            <Check className="size-2.5" strokeWidth={3} />
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate leading-snug">
          {conciseTitle}
        </span>
        {durationLabel ? (
          <span className="shrink-0 text-xs font-normal text-ink-soft">
            {durationLabel}
          </span>
        ) : null}
      </Link>
    </li>
  )
}

function ModuleAccordion({
  courseId,
  module,
  currentLessonId,
  preview,
  defaultOpen,
}: {
  courseId: string
  module: {
    id: string
    title: string
    lessons: FlatOutlineLesson[]
  }
  currentLessonId: string
  preview: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [wasDefaultOpen, setWasDefaultOpen] = useState(defaultOpen)
  const panelId = useId()
  const summary = buildModuleProgressSummary(module.lessons)

  if (defaultOpen !== wasDefaultOpen) {
    setWasDefaultOpen(defaultOpen)
    if (defaultOpen) {
      setOpen(true)
    }
  }

  return (
    <div className="rounded-[var(--radius-input)]">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-[var(--radius-input)] px-1 py-1.5 text-left transition-colors hover:bg-cream2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-ink-soft transition-transform",
            open ? "rotate-0" : "-rotate-90"
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {module.title}
        </span>
        <span className="shrink-0 text-[11px] font-normal normal-case tracking-normal text-ink-soft">
          {summary}
        </span>
      </button>
      {open ? (
        <ol id={panelId} className="mt-0.5 space-y-0.5 pb-1">
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
      ) : null}
    </div>
  )
}

function OutlineHeader({
  courseTitle,
  availableCount,
  completedAvailableCount,
  comingSoonCount,
  preview,
}: {
  courseTitle: string
  availableCount: number
  completedAvailableCount: number
  comingSoonCount: number
  preview: boolean
}) {
  const percent = availableProgressPercent(
    completedAvailableCount,
    availableCount
  )
  const progressLabel =
    availableCount > 0
      ? `${completedAvailableCount} of ${availableCount} available lessons complete`
      : "No available lessons yet"

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <p className="font-display text-base font-medium text-ink">
          {courseTitle}
        </p>
        <p className="text-xs text-ink-soft">{progressLabel}</p>
        {preview && comingSoonCount > 0 ? (
          <p className="text-xs text-ink-soft">
            {comingSoonCount}{" "}
            {comingSoonCount === 1 ? "lesson" : "lessons"} coming soon
          </p>
        ) : null}
        {preview ? (
          <Badge variant="outline" className="mt-1">
            Preview
          </Badge>
        ) : null}
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-cream2"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progressLabel}
        data-available-count={availableCount}
        data-completed-available-count={completedAvailableCount}
      >
        <div
          className="h-full rounded-full bg-blue transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
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
  const currentModuleId =
    modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === currentLessonId)
    )?.id ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <OutlineHeader
        courseTitle={courseTitle}
        availableCount={availableCount}
        completedAvailableCount={completedAvailableCount}
        comingSoonCount={comingSoonCount}
        preview={preview}
      />
      <nav
        aria-label="Course contents"
        className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-0.5"
      >
        {modules.map((module) => (
          <ModuleAccordion
            key={module.id}
            courseId={courseId}
            module={module}
            currentLessonId={currentLessonId}
            preview={preview}
            defaultOpen={module.id === currentModuleId}
          />
        ))}
      </nav>
    </div>
  )
}

export function LessonCourseOutline(props: LessonCourseOutlineProps) {
  const { collapsible = false, ...bodyProps } = props

  if (collapsible) {
    return (
      <details className="group rounded-2xl border border-line bg-surface open:pb-3">
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
        <div className="flex max-h-[min(60vh,28rem)] flex-col px-4 pt-1">
          <OutlineBody {...bodyProps} />
        </div>
      </details>
    )
  }

  return (
    <aside
      className="flex max-h-[calc(100vh-3rem)] flex-col rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-6"
      aria-label="Course outline"
    >
      <OutlineBody {...bodyProps} />
    </aside>
  )
}
