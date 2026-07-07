"use server"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { submitLead } from "@/features/leads/services/leads.service"
import type { SubmitLeadInput } from "@/features/leads/schemas/submit-lead"

export async function submitLeadAction(
  input: SubmitLeadInput
): Promise<ActionResult<{ id: string }>> {
  return submitLead(input)
}
