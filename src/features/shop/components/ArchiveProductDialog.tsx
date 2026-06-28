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
import { archiveProductAction } from "@/features/shop/actions/products.actions"
import type { Product } from "@/features/shop/types"

interface ArchiveProductDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveProductDialog({
  product,
  open,
  onOpenChange,
}: ArchiveProductDialogProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleArchive() {
    if (!product) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    const result = await archiveProductAction(product.id)

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error.message)
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md">
          <DialogTitle>Archive product</DialogTitle>
          <DialogDescription>
            {product
              ? `Archive "${product.title}"? It will no longer appear in the shop.`
              : "Archive this product?"}
          </DialogDescription>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!product || isSubmitting}
              onClick={handleArchive}
            >
              {isSubmitting ? "Archiving..." : "Archive product"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
