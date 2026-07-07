"use client"

import Image from "next/image"

import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui"
import type { BrandImageAsset } from "@/lib/brand/images"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type VideoPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  image?: BrandImageAsset
}

export function VideoPreviewModal({
  open,
  onOpenChange,
  title,
  image = BRAND_IMAGES.meditationSession,
}: VideoPreviewModalProps) {
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
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
                style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
                sizes="(max-width: 768px) 100vw, 760px"
              />
              <div className="absolute inset-0 bg-ink/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <span className="ml-1 border-y-[14px] border-l-[22px] border-y-transparent border-l-white" />
                </div>
              </div>
              <p className="absolute right-4 bottom-4 left-4 text-sm text-white/90">
                Intro preview — full playback is available after enrollment.
              </p>
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
