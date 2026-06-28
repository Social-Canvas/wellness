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
import { archivePlanAction } from "@/features/plans/actions/plans.actions"
import type { PlanWithPrices } from "@/features/plans/types"

interface ArchivePlanDialogProps {
  plan: PlanWithPrices | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchivePlanDialog({
  plan,
  open,
  onOpenChange,
}: ArchivePlanDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleArchive() {
    if (!plan) {
      return
    }

    setFormError(null)
    setIsSubmitting(true)

    const result = await archivePlanAction(plan.id)

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

  if (!plan) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>Archive plan</DialogTitle>
          <DialogDescription>
            Archive &ldquo;{plan.name}&rdquo;? It will be hidden from public
            listings but existing subscriptions are not affected.
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
              disabled={isSubmitting || !plan.is_active}
              onClick={handleArchive}
            >
              {isSubmitting ? "Archiving…" : "Archive plan"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
