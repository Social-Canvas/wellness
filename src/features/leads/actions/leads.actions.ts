"use server"

import { headers } from "next/headers"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  submitLead,
  submitNonprofitPartnership,
} from "@/features/leads/services/leads.service"
import type { SubmitLeadInput } from "@/features/leads/schemas/submit-lead"
import type { SubmitNonprofitPartnershipInput } from "@/features/leads/schemas/submit-nonprofit-partnership"

async function resolveClientIp(): Promise<string> {
  const headerStore = await headers()
  const forwarded = headerStore.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) {
      return first
    }
  }
  return headerStore.get("x-real-ip")?.trim() || "unknown"
}

export async function submitLeadAction(
  input: SubmitLeadInput
): Promise<ActionResult<{ id: string }>> {
  const clientIp = await resolveClientIp()
  return submitLead(input, { clientIp })
}

export async function submitNonprofitPartnershipAction(
  input: SubmitNonprofitPartnershipInput
): Promise<ActionResult<{ id: string }>> {
  const clientIp = await resolveClientIp()
  return submitNonprofitPartnership(input, { clientIp })
}
