import { z } from "zod"

import { emailField, passwordField } from "./fields"

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
})

export type LoginInput = z.infer<typeof loginSchema>
