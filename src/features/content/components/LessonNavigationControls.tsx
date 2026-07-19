"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { Button, buttonVariants } from "@/components/ui"
import {
  markCompleteAndContinueAction,
  type MarkCompleteContinueState,
} from "@/features/progress/actions/mark-complete-continue.action"
import { formatDuration } from "@/features/content/utils/format-duration"
import { deriveLessonHeadline } from "@/features/content/utils/lesson-display"
import type { AdjacentLessonRef } from "@/features/content/utils/lesson-navigation"
import { cn } from "@/lib/utils"

interface LessonNavigationControlsProps {
  courseId: string
  lessonId: string
  videoId: string | null
  isCompleted: boolean
  isAvailable: boolean
  preview: boolean
  previous: AdjacentLessonRef | null
  next: AdjacentLessonRef | null
  previousHref: string | null
  nextHref: string | null
  courseHref: string
  /** When true, emphasize the complete action after video ended. */
  emphasizeComplete?: boolean
}

function SubmitButton({
  label,
  secondary,
  emphasized,
}: {
  label: string
  secondary?: string | null
  emphasized: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size="block"
      disabled={pending}
      className={cn(
        "flex h-auto flex-col gap-0.5 whitespace-normal",
        emphasized && "ring-3 ring-ring/50"
      )}
      aria-busy={pending}
    >
      <span>{pending ? "Saving…" : label}</span>
      {!pending && secondary ? (
        <span className="hidden text-xs font-normal opacity-90 lg:block">
          {secondary}
        </span>
      ) : null}
    </Button>
  )
}

function PrimaryContinueLink({
  href,
  label,
  secondary,
}: {
  href: string
  label: string
  secondary?: string | null
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "default", size: "block" }),
        "flex h-auto flex-col gap-0.5 whitespace-normal"
      )}
      aria-label={secondary ? `${label}: ${secondary}` : label}
    >
      <span>{label}</span>
      {secondary ? (
        <span className="hidden text-xs font-normal opacity-90 lg:block">
          {secondary}
        </span>
      ) : null}
    </Link>
  )
}

function UpNextHint({ next }: { next: AdjacentLessonRef }) {
  const title = deriveLessonHeadline(next.title, next.moduleTitle)
  const duration =
    next.durationSeconds != null
      ? formatDuration(next.durationSeconds)
      : null

  return (
    <p className="text-xs text-ink-soft" data-up-next>
      Up next: {title}
      {duration ? ` · ${duration}` : null}
    </p>
  )
}

function CompactAdjacentLink({
  href,
  direction,
  lesson,
}: {
  href: string
  direction: "previous" | "next"
  lesson: AdjacentLessonRef
}) {
  const title = deriveLessonHeadline(lesson.title, lesson.moduleTitle)
  const isPrevious = direction === "previous"

  return (
    <Link
      href={href}
      className={cn(
        "min-w-0 flex-1 rounded-[var(--radius-input)] px-1 py-1.5 text-sm transition-colors hover:bg-cream2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        isPrevious ? "text-left" : "text-right"
      )}
      aria-label={`${isPrevious ? "Previous" : "Next"} lesson: ${lesson.title}`}
    >
      <span className="block text-xs text-ink-soft">
        {isPrevious ? "← Previous" : "Next →"}
      </span>
      <span className="mt-0.5 block truncate font-medium text-ink">{title}</span>
    </Link>
  )
}

const initialState: MarkCompleteContinueState = { status: "idle" }

function PrimaryActionBlock({
  courseId,
  lessonId,
  videoId,
  isCompleted,
  isAvailable,
  preview,
  next,
  nextHref,
  courseHref,
  emphasizeComplete,
  className,
}: {
  courseId: string
  lessonId: string
  videoId: string | null
  isCompleted: boolean
  isAvailable: boolean
  preview: boolean
  next: AdjacentLessonRef | null
  nextHref: string | null
  courseHref: string
  emphasizeComplete: boolean
  className?: string
}) {
  const [state, formAction] = useActionState(
    markCompleteAndContinueAction,
    initialState
  )

  const nextTitle = next
    ? deriveLessonHeadline(next.title, next.moduleTitle)
    : null

  if (!isAvailable) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)} data-primary-action>
      {next && !isCompleted ? <UpNextHint next={next} /> : null}
      {isCompleted ? (
        nextHref && next ? (
          <div className="space-y-2">
            <UpNextHint next={next} />
            <PrimaryContinueLink
              href={nextHref}
              label="Continue to next lesson"
              secondary={nextTitle}
            />
          </div>
        ) : (
          <PrimaryContinueLink
            href={courseHref}
            label="Return to course overview"
          />
        )
      ) : videoId ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="videoId" value={videoId} />
          {preview ? <input type="hidden" name="preview" value="1" /> : null}
          <SubmitButton
            label={next ? "Mark complete & continue" : "Mark complete & finish"}
            secondary={nextTitle}
            emphasized={emphasizeComplete}
          />
          {emphasizeComplete ? (
            <p className="text-xs text-ink-soft">
              Video finished — mark complete when you are ready to continue.
            </p>
          ) : null}
          {state.status === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

export function LessonNavigationControls({
  courseId,
  lessonId,
  videoId,
  isCompleted,
  isAvailable,
  preview,
  previous,
  next,
  previousHref,
  nextHref,
  courseHref,
  emphasizeComplete = false,
}: LessonNavigationControlsProps) {
  const primaryProps = {
    courseId,
    lessonId,
    videoId,
    isCompleted,
    isAvailable,
    preview,
    next,
    nextHref,
    courseHref,
    emphasizeComplete,
  }

  const showStickyPrimary =
    isAvailable && (Boolean(videoId) || isCompleted)

  return (
    <div className="space-y-4">
      {/* Desktop / large tablet: inline primary action */}
      <PrimaryActionBlock {...primaryProps} className="hidden lg:block" />

      <div
        className="flex items-stretch gap-2 border-t border-line pt-3"
        data-adjacent-nav
      >
        {previousHref && previous ? (
          <CompactAdjacentLink
            href={previousHref}
            direction="previous"
            lesson={previous}
          />
        ) : (
          <span className="flex-1" aria-hidden="true" />
        )}
        {nextHref && next ? (
          <CompactAdjacentLink
            href={nextHref}
            direction="next"
            lesson={next}
          />
        ) : (
          <span className="flex-1" aria-hidden="true" />
        )}
      </div>

      {/* Mobile / small tablet: sticky primary without duplicating desktop */}
      {showStickyPrimary ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
          data-mobile-sticky-action
        >
          <PrimaryActionBlock {...primaryProps} />
        </div>
      ) : null}
    </div>
  )
}
