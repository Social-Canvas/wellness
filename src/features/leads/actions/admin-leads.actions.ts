"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { updateLeadStatus } from "@/features/leads/services/admin-leads.service"
import type { UpdateLeadStatusInput } from "@/features/leads/schemas/update-lead-status"
import type { LeadListItem } from "@/features/leads/types"

export async function updateLeadStatusAction(
  input: UpdateLeadStatusInput
): Promise<ActionResult<LeadListItem>> {
  const result = await updateLeadStatus(input)

  if (result.success) {
    revalidatePath("/admin/leads")
    revalidatePath(`/admin/leads/${input.leadId}`)
  }

  return result
}
