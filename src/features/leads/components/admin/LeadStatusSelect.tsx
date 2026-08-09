"use client"

import { useState, useTransition } from "react"

import { updateLeadStatusAction } from "@/features/leads/actions/admin-leads.actions"
import {
  LEAD_STATUSES,
  type UpdateLeadStatusInput,
} from "@/features/leads/schemas/update-lead-status"
import type { LeadStatus } from "@/features/leads/types"
import { LEAD_STATUS_LABELS } from "@/features/leads/utils/lead-labels"
import { productSelectClassName } from "@/features/shop/components/product-form-styles"
import { cn } from "@/lib/utils"

type LeadStatusSelectProps = {
  leadId: string
  status: LeadStatus
  className?: string
}

export function LeadStatusSelect({
  leadId,
  status,
  className,
}: LeadStatusSelectProps) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as LeadStatus
    const previous = currentStatus
    setCurrentStatus(nextStatus)
    setError(null)

    const input: UpdateLeadStatusInput = {
      leadId,
      status: nextStatus,
    }

    startTransition(async () => {
      const result = await updateLeadStatusAction(input)
      if (!result.success) {
        setCurrentStatus(previous)
        setError(result.error.message)
      }
    })
  }

  return (
    <div className={cn("space-y-1", className)}>
      <select
        aria-label="Enquiry status"
        className={cn(productSelectClassName, "max-w-[180px] py-2")}
        value={currentStatus}
        disabled={isPending}
        onChange={handleChange}
      >
        {LEAD_STATUSES.map((value) => (
          <option key={value} value={value}>
            {LEAD_STATUS_LABELS[value]}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
