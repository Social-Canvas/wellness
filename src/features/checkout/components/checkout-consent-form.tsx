"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button, Card, CardContent, Input, Label } from "@/components/ui"
import { proceedToCheckoutAction } from "@/features/checkout/actions/checkout.actions"
import {
  CHECKOUT_COUPON_NOTE,
  EDUCATIONAL_DISCLAIMER,
} from "@/features/checkout/constants/disclaimer"
import type { CheckoutConsentContext } from "@/features/checkout/services/checkout.service"
import { cn } from "@/lib/utils"

type CheckoutConsentFormProps = {
  context: CheckoutConsentContext
  defaultFullName?: string | null
  defaultEmail?: string | null
  isAuthenticated: boolean
}

export function CheckoutConsentForm({
  context,
  defaultFullName,
  defaultEmail,
  isAuthenticated,
}: CheckoutConsentFormProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [fullName, setFullName] = useState(defaultFullName ?? "")
  const [email, setEmail] = useState(defaultEmail ?? "")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loginNext = `${pathname}?${searchParams.toString()}`

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!consent) {
      setError("Please confirm you agree to receive access and emails.")
      return
    }

    if (!isAuthenticated) {
      window.location.href = `/login?next=${encodeURIComponent(loginNext)}`
      return
    }

    setIsSubmitting(true)

    const result = await proceedToCheckoutAction({
      fullName,
      email,
      consent: true,
      type: context.type,
      planSlug: context.planSlug,
      productSlug: context.productSlug,
      interval: context.interval,
    })

    setIsSubmitting(false)

    if (!result.success) {
      if (result.error.code === "authentication_required") {
        window.location.href = `/login?next=${encodeURIComponent(loginNext)}`
        return
      }

      setError(result.error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="rounded-[var(--radius-input)] border border-line bg-cream px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{context.itemName}</p>
                {context.itemDescription ? (
                  <p className="mt-1 text-sm text-ink-soft">{context.itemDescription}</p>
                ) : null}
              </div>
              <p className="font-display text-lg font-semibold text-ink">{context.priceLabel}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-full-name">Full name</Label>
            <Input
              id="checkout-full-name"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-email">Email address</Label>
            <Input
              id="checkout-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 size-4 rounded border-line"
            />
            <span>
              Yes, send me my access, receipts, and our emails. I can unsubscribe anytime.
            </span>
          </label>

          <p className="rounded-[var(--radius-input)] bg-cream px-4 py-3 text-sm text-ink-soft">
            {EDUCATIONAL_DISCLAIMER}
          </p>

          <p className="text-xs text-ink-soft">{CHECKOUT_COUPON_NOTE}</p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? "Redirecting to checkout..."
              : isAuthenticated
                ? "Continue to checkout"
                : "Sign in to continue"}
          </Button>

          <p className="text-center text-xs text-ink-soft">
            🔒 Secure encrypted checkout · powered by Stripe
          </p>

          {!isAuthenticated ? (
            <p className="text-center text-sm text-ink-soft">
              Need an account?{" "}
              <Link
                href={`/signup?next=${encodeURIComponent(loginNext)}`}
                className={cn("font-semibold text-blue hover:text-blue-deep")}
              >
                Create one
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </form>
  )
}
