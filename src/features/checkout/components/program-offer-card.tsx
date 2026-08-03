"use client"

import Link from "next/link"

import { BrandImage } from "@/components/media"
import { buttonVariants } from "@/components/ui/button"
import type { BrandImageAsset } from "@/lib/brand/images"
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
  image: BrandImageAsset
  ctaDisabled?: boolean
  supportingText?: string | null
  hidePrice?: boolean
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
  image,
  ctaDisabled = false,
  supportingText = null,
  hidePrice = false,
}: ProgramOfferCardProps) {
  const actionHref = checkoutHref ?? fallbackHref

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-sm">
      <div className="relative aspect-video overflow-hidden">
        <BrandImage
          image={image}
          containerClassName="absolute inset-0"
          sizes="(max-width: 860px) 100vw, 50vw"
        />
        <span className="absolute top-3 left-3 rounded-[20px] bg-[rgba(255,255,255,0.9)] px-2.5 py-1.5 text-[11px] font-bold tracking-[0.06em] text-green-deep uppercase backdrop-blur-sm">
          {category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h4 className="font-display text-lg font-medium text-ink">{title}</h4>
        <p className="mt-1.5 mb-3.5 text-sm text-ink-soft">{description}</p>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {hidePrice ? (
              <span className="font-display text-lg font-semibold text-ink">
                {ctaDisabled ? ctaLabel : "Access active"}
              </span>
            ) : (
              <span className="font-display text-lg font-semibold text-ink">
                {formatProductPrice(priceCents, currency)}
                {priceNote ? (
                  <small className="ml-1 font-body text-xs font-normal text-ink-soft">
                    {priceNote}
                  </small>
                ) : null}
              </span>
            )}

            {ctaDisabled ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={supportingText ?? ctaLabel}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "max-w-[min(100%,14rem)] cursor-not-allowed whitespace-normal text-center leading-snug opacity-60"
                )}
              >
                {ctaLabel}
              </button>
            ) : (
              <Link
                href={actionHref}
                className={cn(buttonVariants({ variant: ctaVariant, size: "sm" }))}
              >
                {ctaLabel}
              </Link>
            )}
          </div>
          {supportingText ? (
            <p className="text-xs text-ink-soft">{supportingText}</p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
