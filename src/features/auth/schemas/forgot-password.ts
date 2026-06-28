import { z } from "zod"

import { emailField } from "./fields"

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
