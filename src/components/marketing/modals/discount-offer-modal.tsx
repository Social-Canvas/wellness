"use client"

import Link from "next/link"

import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui"
import { buttonVariants } from "@/components/ui/button"
import {
  CHECKOUT_COUPON_NOTE,
  EDUCATIONAL_DISCLAIMER,
} from "@/features/checkout/constants/disclaimer"
import { buildCheckoutConsentUrl } from "@/features/checkout/utils/checkout-urls"
import { cn } from "@/lib/utils"

type DiscountOfferModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  couponCode?: string
  couponLabel?: string
  upgradeHref?: string
  upgradeLabel?: string
}

export function DiscountOfferModal({
  open,
  onOpenChange,
  title = "You did it! Ready for the next level?",
  description = "You've completed this program. Keep your momentum and go deeper with the next level.",
  couponCode = "LEVEL2-10",
  couponLabel = "10% off",
  upgradeHref = buildCheckoutConsentUrl({ type: "membership", planSlug: "plan-2" }),
  upgradeLabel = "Enroll in the next level",
}: DiscountOfferModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-md text-center">
          <DialogClose
            className="absolute top-3.5 right-4 text-[22px] leading-none text-ink-soft"
            aria-label="Close offer"
          >
            ✕
          </DialogClose>
          <div
            aria-hidden
            className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-soft text-2xl text-green-deep"
          >
            ★
          </div>
          <DialogTitle className="text-[22px]">{title}</DialogTitle>
          <DialogDescription className="mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed">
            {description}
          </DialogDescription>
          <div className="my-3.5 rounded-[10px] border border-dashed border-green bg-green-soft px-3 py-3 font-display text-xl tracking-[0.08em] text-green-deep">
            {couponCode} · {couponLabel}
          </div>
          <p className="text-xs text-ink-soft">{CHECKOUT_COUPON_NOTE}</p>
          <p className="mt-2 text-xs text-ink-soft">{EDUCATIONAL_DISCLAIMER}</p>
          <Link
            href={upgradeHref}
            className={cn(buttonVariants({ variant: "default", size: "block" }), "mt-5")}
          >
            {upgradeLabel}
          </Link>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
