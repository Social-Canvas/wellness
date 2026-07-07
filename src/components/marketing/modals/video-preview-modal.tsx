"use client"

import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui"
import { cn } from "@/lib/utils"

type VideoPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
}

export function VideoPreviewModal({ open, onOpenChange, title }: VideoPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-3xl overflow-hidden p-0">
          <DialogTitle className="sr-only">{title} preview</DialogTitle>
          <div className="relative">
            <DialogClose
              className={cn(
                "absolute top-3.5 right-4 z-10 text-xl leading-none text-white",
                "hover:text-white/80"
              )}
              aria-label="Close preview"
            >
              ✕
            </DialogClose>
            <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-blue-deep to-green-deep">
              <div className="flex size-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <span className="ml-1 border-y-[14px] border-l-[22px] border-y-transparent border-l-white" />
              </div>
              <p className="absolute bottom-4 left-4 right-4 text-sm text-white/90">
                Intro preview placeholder — full playback is available after enrollment.
              </p>
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
