import { z } from "zod"

export const redeemOrganizationAccessSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, "Enter the organization access code.")
    .max(64, "Access code is too long."),
})

export type RedeemOrganizationAccessInput = z.infer<
  typeof redeemOrganizationAccessSchema
>
