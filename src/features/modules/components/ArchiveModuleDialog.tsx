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
import { archiveModuleAction } from "@/features/modules/actions/modules.actions"
import type { Module } from "@/features/modules/types"

interface ArchiveModuleDialogProps {
  courseId: string
  module: Module | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveModuleDialog({
  courseId,
  module,
  open,
  onOpenChange,
}: ArchiveModuleDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleArchive() {
    if (!module) {
      return
    }

    setFormError(null)
    setIsSubmitting(true)

    const result = await archiveModuleAction(courseId, module.id)

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

  if (!module) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Archive module</DialogTitle>
          <DialogDescription>
            Archive &ldquo;{module.title}&rdquo;? It will be hidden from the course
            outline but can be restored by editing its status later.
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
              disabled={isSubmitting || module.status === "archived"}
              onClick={handleArchive}
            >
              {isSubmitting ? "Archiving…" : "Archive module"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
