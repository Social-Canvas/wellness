"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui"
import { claimFreeDigitalProductAction } from "@/features/shop/actions/shop.actions"
import { freeClaimLoadingLabel } from "@/features/shop/utils/free-claim"

interface ClaimFreeProductButtonProps {
  productSlug: string
  label?: string
}

export function ClaimFreeProductButton({
  productSlug,
  label = "Get free journal",
}: ClaimFreeProductButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await claimFreeDigitalProductAction({ productSlug })
            if (!result.success) {
              setError(result.error.message)
            }
          })
        }}
      >
        {isPending ? freeClaimLoadingLabel() : label}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
