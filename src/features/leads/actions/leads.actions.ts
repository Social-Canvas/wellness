"use server"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  submitLead,
  submitNonprofitPartnership,
} from "@/features/leads/services/leads.service"
import type { SubmitLeadInput } from "@/features/leads/schemas/submit-lead"
import type { SubmitNonprofitPartnershipInput } from "@/features/leads/schemas/submit-nonprofit-partnership"

export async function submitLeadAction(
  input: SubmitLeadInput
): Promise<ActionResult<{ id: string }>> {
  return submitLead(input)
}

export async function submitNonprofitPartnershipAction(
  input: SubmitNonprofitPartnershipInput
): Promise<ActionResult<{ id: string }>> {
  return submitNonprofitPartnership(input)
}
