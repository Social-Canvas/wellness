import { z } from "zod"

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "closed",
] as const

export const updateLeadStatusSchema = z.object({
  leadId: z.uuid("Invalid enquiry id."),
  status: z.enum(LEAD_STATUSES),
})

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
