"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { Button, buttonVariants } from "@/components/ui"
import {
  markCompleteAndContinueAction,
  type MarkCompleteContinueState,
} from "@/features/progress/actions/mark-complete-continue.action"
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
  /** When true, emphasize the complete action after video ended. */
  emphasizeComplete?: boolean
}

function SubmitButton({
  label,
  emphasized,
}: {
  label: string
  emphasized: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size="block"
      disabled={pending}
      className={cn(emphasized && "ring-3 ring-ring/50")}
      aria-busy={pending}
    >
      {pending ? "Saving…" : label}
    </Button>
  )
}

const initialState: MarkCompleteContinueState = { status: "idle" }

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
  emphasizeComplete = false,
}: LessonNavigationControlsProps) {
  const [state, formAction] = useActionState(
    markCompleteAndContinueAction,
    initialState
  )

  return (
    <div className="space-y-4">
      {isAvailable && isCompleted ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink" role="status">
            Completed
          </p>
          {nextHref && next ? (
            <Link
              href={nextHref}
              className={cn(buttonVariants({ variant: "default", size: "block" }))}
              aria-label={`Continue to next lesson: ${next.title}`}
            >
              Continue to next lesson
            </Link>
          ) : (
            <p className="text-sm text-ink-soft">
              You have finished every available lesson in this course.
            </p>
          )}
        </div>
      ) : null}

      {isAvailable && !isCompleted && videoId ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="videoId" value={videoId} />
          {preview ? <input type="hidden" name="preview" value="1" /> : null}
          <SubmitButton
            label="Mark complete & continue"
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {previousHref && previous ? (
          <Link
            href={previousHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "min-h-11 flex-1 justify-start sm:max-w-[50%]"
            )}
            aria-label={`Previous lesson: ${previous.title}`}
          >
            <span className="truncate">
              <span className="block text-xs font-normal text-ink-soft">
                Previous lesson
              </span>
              <span className="block truncate">{previous.title}</span>
            </span>
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "min-h-11 flex-1 justify-start opacity-50 sm:max-w-[50%]"
            )}
            aria-disabled="true"
          >
            <span className="truncate">
              <span className="block text-xs font-normal text-ink-soft">
                Previous lesson
              </span>
              <span className="block">None</span>
            </span>
          </span>
        )}

        {nextHref && next ? (
          <Link
            href={nextHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "min-h-11 flex-1 justify-end text-right sm:max-w-[50%] sm:ml-auto"
            )}
            aria-label={`Next lesson: ${next.title}`}
          >
            <span className="truncate">
              <span className="block text-xs font-normal text-ink-soft">
                Next lesson
              </span>
              <span className="block truncate">{next.title}</span>
            </span>
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "min-h-11 flex-1 justify-end text-right opacity-50 sm:max-w-[50%] sm:ml-auto"
            )}
            aria-disabled="true"
          >
            <span className="truncate">
              <span className="block text-xs font-normal text-ink-soft">
                Next lesson
              </span>
              <span className="block">None</span>
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
