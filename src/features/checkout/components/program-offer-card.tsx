"use client"

import Link from "next/link"
import { useState } from "react"

import { VideoPreviewModal } from "@/components/marketing/modals"
import { buttonVariants } from "@/components/ui/button"
import { formatProductPrice } from "@/features/shop/utils/format-product"
import { cn } from "@/lib/utils"

type ProgramOfferCardProps = {
  category: string
  title: string
  description: string
  priceCents: number
  currency: string
  priceNote?: string
  ctaLabel: string
  ctaVariant: "default" | "outline"
  checkoutHref: string | null
  fallbackHref: string
}

export function ProgramOfferCard({
  category,
  title,
  description,
  priceCents,
  currency,
  priceNote,
  ctaLabel,
  ctaVariant,
  checkoutHref,
  fallbackHref,
}: ProgramOfferCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const actionHref = checkoutHref ?? fallbackHref

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left">
        <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-blue-soft to-green-soft">
          <span className="absolute top-3 left-3 rounded-[20px] bg-[rgba(255,255,255,0.85)] px-2.5 py-1.5 text-[11px] font-bold tracking-[0.06em] text-green-deep uppercase">
            {category}
          </span>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex size-[42px] items-center justify-center rounded-full bg-blue transition-colors hover:bg-blue-deep"
            aria-label={`Watch intro for ${title}`}
          >
            <span className="ml-0.5 border-y-8 border-l-[13px] border-y-transparent border-l-white" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="absolute bottom-3 right-3 rounded-[20px] bg-[rgba(255,255,255,0.9)] px-3 py-1.5 text-xs font-bold text-ink-soft"
          >
            Watch intro
          </button>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h4 className="font-display text-lg font-medium text-ink">{title}</h4>
          <p className="mt-1.5 mb-3.5 text-sm text-ink-soft">{description}</p>

          <div className="mt-auto flex items-center justify-between gap-3">
            <span className="font-display text-lg font-semibold text-ink">
              {formatProductPrice(priceCents, currency)}
              {priceNote ? (
                <small className="ml-1 font-body text-xs font-normal text-ink-soft">
                  {priceNote}
                </small>
              ) : null}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "hidden min-[520px]:inline-flex"
                )}
              >
                Preview
              </button>
              <Link
                href={actionHref}
                className={cn(buttonVariants({ variant: ctaVariant, size: "sm" }))}
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </article>

      <VideoPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} title={title} />
    </>
  )
}
