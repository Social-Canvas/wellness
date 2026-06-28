import { z } from "zod"

import { avatarUrlField, fullNameField, phoneField } from "./fields"

export const updateProfileSchema = z.object({
  fullName: fullNameField,
  phone: phoneField.optional(),
  avatarUrl: avatarUrlField.optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
