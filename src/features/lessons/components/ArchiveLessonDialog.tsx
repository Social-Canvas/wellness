"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui"
import { archiveLessonAction } from "@/features/lessons/actions/lessons.actions"
import type { Lesson } from "@/features/lessons/types"

interface ArchiveLessonDialogProps {
  courseId: string
  moduleId: string
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveLessonDialog({
  courseId,
  moduleId,
  lesson,
  open,
  onOpenChange,
}: ArchiveLessonDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleArchive() {
    if (!lesson) {
      return
    }

    setFormError(null)
    setIsSubmitting(true)

    const result = await archiveLessonAction(courseId, moduleId, lesson.id)

    setIsSubmitting(false)

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setFormError(null)
    }

    onOpenChange(nextOpen)
  }

  if (!lesson) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Archive lesson</DialogTitle>
          <DialogDescription>
            Archive &ldquo;{lesson.title}&rdquo;? It will be hidden from the course
            outline but existing progress is preserved.
          </DialogDescription>

          {formError ? (
            <p
              role="alert"
              className="mt-4 rounded-[var(--radius-input)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting || lesson.status === "archived"}
              onClick={handleArchive}
            >
              {isSubmitting ? "Archiving…" : "Archive lesson"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
