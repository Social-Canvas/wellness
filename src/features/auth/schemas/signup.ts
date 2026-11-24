import { z } from "zod"

const SIGNUP_HONEYPOT_FIELD = "companyUrl" as const

import { emailField, fullNameField, passwordField } from "./fields"

export const signupSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  password: passwordField,
  [SIGNUP_HONEYPOT_FIELD]: z.string().max(200).optional().nullable(),
  turnstileToken: z.string().max(4000).optional().nullable(),
})

export type SignupInput = z.infer<typeof signupSchema>
