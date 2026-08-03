"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui"
import { schedulePersonalDowngradeAction } from "@/features/billing/actions/billing.actions"
import { shortPlanName } from "@/features/checkout/utils/membership-plan-cta-state"

export function ScheduleDowngradeConfirm({
  targetPlanSlug,
}: {
  targetPlanSlug: "plan-1" | "plan-2" | "plan-3"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="rounded-2xl border border-line bg-cream px-4 py-4">
      <p className="text-sm text-ink">
        Schedule a downgrade to Elevate {shortPlanName(targetPlanSlug)} at the
        end of your current billing period. Your current plan stays active until
        then.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null)
              const result = await schedulePersonalDowngradeAction(targetPlanSlug)
              if (!result.success) {
                setMessage(result.error.message)
                return
              }
              router.replace("/dashboard/account")
              router.refresh()
            })
          }
        >
          {pending
            ? "Scheduling…"
            : `Confirm downgrade to ${shortPlanName(targetPlanSlug)}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.replace("/dashboard/account")}
        >
          Cancel
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-destructive">{message}</p> : null}
    </div>
  )
}
