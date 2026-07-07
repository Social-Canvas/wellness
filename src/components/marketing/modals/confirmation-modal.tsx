"use client"

import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CheckoutConfirmationProps = {
  title?: string
  message: string
  itemName: string
  itemPrice?: string | null
  emailNote?: string | null
  actionHref: string
  actionLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  className?: string
}

export function CheckoutConfirmation({
  title = "Payment successful",
  message,
  itemName,
  itemPrice,
  emailNote,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: CheckoutConfirmationProps) {
  return (
    <div className={cn("text-center", className)}>
      <div
        aria-hidden
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-soft text-3xl text-green-deep"
      >
        ✓
      </div>
      <h2 className="mt-4 font-display text-3xl font-medium text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-base text-ink-soft">{message}</p>

      <div className="mx-auto mt-6 max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
          <div>
            <p className="font-semibold text-ink">Invoice</p>
            <p className="text-xs text-ink-soft">Receipt from Stripe</p>
          </div>
          <p className="text-xs text-ink-soft">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 text-sm">
          <span className="text-ink-soft">{itemName}</span>
          <span className="font-medium text-ink">{itemPrice ?? "Paid"}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-line pt-3 text-sm font-semibold text-ink">
          <span>Total paid</span>
          <span>{itemPrice ?? "Confirmed"}</span>
        </div>
      </div>

      {emailNote ? (
        <p className="mx-auto mt-4 max-w-md text-sm text-green-deep">{emailNote}</p>
      ) : (
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
          A receipt and invoice will be emailed automatically when Stripe confirms payment.
        </p>
      )}

      <div className="mx-auto mt-5 flex max-w-md flex-col gap-3">
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: "default", size: "block" }))}
        >
          {actionLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className={cn(buttonVariants({ variant: "outline", size: "block" }))}
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

type ConfirmationModalProps = CheckoutConfirmationProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConfirmationModal({
  open,
  onOpenChange,
  ...confirmationProps
}: ConfirmationModalProps) {
  return (
    <div className={open ? "fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" : "hidden"}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card-lg)] border border-line bg-surface p-8"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-xl text-ink-soft"
          aria-label="Close"
        >
          ✕
        </button>
        <CheckoutConfirmation {...confirmationProps} />
      </div>
    </div>
  )
}
