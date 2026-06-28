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
import { archiveCourseAction } from "@/features/courses/actions/courses.actions"
import type { CourseWithPlanAccess } from "@/features/courses/types"

interface ArchiveCourseDialogProps {
  course: CourseWithPlanAccess | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveCourseDialog({
  course,
  open,
  onOpenChange,
}: ArchiveCourseDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleArchive() {
    if (!course) {
      return
    }

    setFormError(null)
    setIsSubmitting(true)

    const result = await archiveCourseAction(course.id)

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

  if (!course) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Archive course</DialogTitle>
          <DialogDescription>
            Archive &ldquo;{course.title}&rdquo;? It will be hidden from member
            catalogs but existing progress is preserved.
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
              disabled={isSubmitting || course.status === "archived"}
              onClick={handleArchive}
            >
              {isSubmitting ? "Archiving…" : "Archive course"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
