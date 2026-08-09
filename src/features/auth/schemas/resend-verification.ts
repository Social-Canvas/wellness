import { z } from "zod"

import { emailField } from "./fields"

export const resendVerificationSchema = z.object({
  email: emailField,
})

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>
