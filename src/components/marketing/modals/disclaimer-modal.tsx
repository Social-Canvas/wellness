"use client"

import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui"
import { DISCLAIMER_MODAL_INTRO } from "@/features/checkout/constants/disclaimer"

type DisclaimerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccept: () => void
}

export function DisclaimerModal({ open, onOpenChange, onAccept }: DisclaimerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md text-center">
          <DialogTitle className="text-[22px]">Before you begin</DialogTitle>
          <DialogDescription className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed">
            {DISCLAIMER_MODAL_INTRO}
          </DialogDescription>
          <Button type="button" className="mt-5 w-full" onClick={onAccept}>
            I understand
          </Button>
          <DialogClose className="sr-only">Close</DialogClose>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
