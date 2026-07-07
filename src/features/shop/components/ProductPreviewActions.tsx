"use client"

import { useState } from "react"

import { VideoPreviewModal } from "@/components/marketing/modals"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ProductPreviewActionsProps = {
  title: string
}

export function ProductPreviewActions({ title }: ProductPreviewActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="absolute inset-0 flex items-center justify-center bg-ink/10 transition-colors hover:bg-ink/20"
        aria-label={`Preview ${title}`}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-blue">
          <span className="ml-1 border-y-[12px] border-l-[18px] border-y-transparent border-l-white" />
        </span>
      </button>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="absolute right-3 bottom-3 rounded-[20px] bg-[rgba(255,255,255,0.9)] px-3 py-1.5 text-xs font-bold text-ink-soft"
      >
        Watch intro
      </button>
      <VideoPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} title={title} />
    </>
  )
}

export function ProductPreviewLink({ title, className }: ProductPreviewActionsProps & { className?: string }) {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
      >
        Preview
      </button>
      <VideoPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} title={title} />
    </>
  )
}
