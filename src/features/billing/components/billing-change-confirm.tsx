"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui"
import {
  confirmBillingChangeAction,
  previewBillingChangeAction,
} from "@/features/billing/actions/billing.actions"
import type { BillingChangePreview } from "@/features/billing/services/membership-lifecycle.service"
import { shortPlanName } from "@/features/checkout/utils/membership-plan-cta-state"

function formatMoney(cents: number | null, currency: string): string {
  if (cents == null) {
    return "—"
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; preview: BillingChangePreview }

export function BillingChangeConfirm({
  targetPlanSlug,
  targetBillingInterval,
}: {
  targetPlanSlug: "plan-1" | "plan-2" | "plan-3"
  targetBillingInterval: "monthly" | "yearly"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<PreviewState>({ status: "loading" })
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void previewBillingChangeAction({
      targetPlanSlug,
      targetBillingInterval,
    }).then((result) => {
      if (cancelled) return
      if (!result.success) {
        setState({ status: "error", message: result.error.message })
        return
      }
      setState({ status: "ready", preview: result.data })
    })

    return () => {
      cancelled = true
    }
  }, [targetPlanSlug, targetBillingInterval])

  const cadenceLabel =
    targetBillingInterval === "yearly" ? "annual" : "monthly"
  const preview = state.status === "ready" ? state.preview : null
  const loadingPreview = state.status === "loading"
  const error =
    actionError ?? (state.status === "error" ? state.message : null)

  return (
    <div className="rounded-2xl border border-line bg-cream px-4 py-4">
      <p className="text-sm font-semibold text-ink">
        Switch to Elevate {shortPlanName(targetPlanSlug)} ({cadenceLabel}{" "}
        billing)
      </p>

      {loadingPreview ? (
        <p className="mt-2 text-sm text-ink-soft">Loading billing preview…</p>
      ) : null}

      {preview ? (
        <div className="mt-2 space-y-1 text-sm text-ink-soft">
          <p>
            Current: {preview.currentPlanName} ·{" "}
            {preview.currentInterval === "yearly" ? "Annual" : "Monthly"} billing
          </p>
          <p>
            Target: Elevate {shortPlanName(targetPlanSlug)} ·{" "}
            {preview.targetInterval === "yearly" ? "Annual" : "Monthly"} billing
          </p>
          {preview.classification === "immediate" ? (
            <>
              <p>
                Amount due now:{" "}
                {formatMoney(preview.amountDueNowCents, preview.currency)}
              </p>
              <p>
                Next renewal:{" "}
                {formatMoney(preview.nextRenewalAmountCents, preview.currency)}
                {preview.nextRenewalDate
                  ? ` on ${new Date(preview.nextRenewalDate).toLocaleDateString("en-US", { dateStyle: "medium" })}`
                  : ""}
              </p>
              {preview.creditNote ? <p>{preview.creditNote}</p> : null}
            </>
          ) : (
            <p>{preview.message}</p>
          )}
          <p className="pt-1">{preview.message}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || loadingPreview || !preview}
          onClick={() =>
            startTransition(async () => {
              setActionError(null)
              const result = await confirmBillingChangeAction({
                targetPlanSlug,
                targetBillingInterval,
              })
              if (!result.success) {
                setActionError(result.error.message)
                return
              }
              router.replace("/dashboard/account")
              router.refresh()
            })
          }
        >
          {pending ? "Confirming…" : "Confirm billing change"}
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
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
