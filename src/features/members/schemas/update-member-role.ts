import { z } from "zod"

export const memberRoleSchema = z.enum(["user", "admin", "super_admin"])

export const updateMemberRoleSchema = z.object({
  profileId: z.uuid("Invalid member id."),
  role: memberRoleSchema,
})

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
