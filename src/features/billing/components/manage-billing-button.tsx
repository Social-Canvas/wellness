"use client"

import { useState, useTransition } from "react"

import { buttonVariants } from "@/components/ui/button"
import { createBillingPortalSessionAction } from "@/features/billing/actions/billing.actions"
import { cn } from "@/lib/utils"

export function ManageBillingButton() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-2 pt-2">
      <button
        type="button"
        disabled={isPending}
        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await createBillingPortalSessionAction()
            if (!result.success) {
              setError(result.error.message)
              return
            }
            window.location.assign(result.data.url)
          })
        }}
      >
        {isPending ? "Opening billing…" : "Manage billing"}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  )
}
