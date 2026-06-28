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
import { archiveVideoAction } from "@/features/videos/actions/videos.actions"
import type { Video } from "@/features/videos/types"

interface ArchiveVideoDialogProps {
  video: Video | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveVideoDialog({
  video,
  open,
  onOpenChange,
}: ArchiveVideoDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleArchive() {
    if (!video) {
      return
    }

    setFormError(null)
    setIsSubmitting(true)

    const result = await archiveVideoAction(video.id)

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

  if (!video) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Archive video</DialogTitle>
          <DialogDescription>
            Archive &ldquo;{video.title}&rdquo;? It will be hidden from playback but
            linked lessons keep their reference.
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
              disabled={isSubmitting || video.status === "archived"}
              onClick={handleArchive}
            >
              {isSubmitting ? "Archiving…" : "Archive video"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
