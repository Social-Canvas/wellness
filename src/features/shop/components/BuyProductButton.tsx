"use client"

import Link from "next/link"
import { useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui"
import { createProductCheckoutAction } from "@/features/shop/actions/shop.actions"
import { cn } from "@/lib/utils"

interface BuyProductButtonProps {
  productId: string
}

export function BuyProductButton({ productId }: BuyProductButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleBuy() {
    setError(null)
    setIsSubmitting(true)

    const result = await createProductCheckoutAction({ productId })

    setIsSubmitting(false)

    if (!result.success) {
      if (result.error.code === "authentication_required") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
        return
      }

      setError(result.error.message)
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleBuy} disabled={isSubmitting}>
        {isSubmitting ? "Redirecting..." : "Buy now"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive">
          {error}{" "}
          {error.includes("sign") || error.includes("log") ? null : (
            <Link href="/login" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}>
              Log in
            </Link>
          )}
        </p>
      ) : null}
    </div>
  )
}
