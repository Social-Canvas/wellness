"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui"
import { deactivatePromoCodeAction } from "@/features/promo-codes/actions/promo-codes.actions"

interface DeactivatePromoCodeButtonProps {
  promotionCodeId: string
  code: string
}

export function DeactivatePromoCodeButton({
  promotionCodeId,
  code,
}: DeactivatePromoCodeButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function turnOff() {
    const confirmed = window.confirm(
      `Turn off ${code}? New checkouts will no longer accept it.`
    )
    if (!confirmed) {
      return
    }

    setPending(true)
    setError(null)
    const result = await deactivatePromoCodeAction(promotionCodeId)
    setPending(false)

    if (!result.success) {
      setError(result.error.message)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          void turnOff()
        }}
      >
        {pending ? "Turning off..." : "Turn off"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
