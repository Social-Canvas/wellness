import { z } from "zod"

const SIGNUP_HONEYPOT_FIELD = "companyUrl" as const

import {
  certificateNameConfirmField,
  certificateNameField,
} from "./certificate-name"
import { emailField, passwordField } from "./fields"

export const signupSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm your password"),
    certificateName: certificateNameField,
    confirmCertificateName: certificateNameConfirmField,
    [SIGNUP_HONEYPOT_FIELD]: z.string().max(200).optional().nullable(),
    turnstileToken: z.string().max(4000).optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignupInput = z.infer<typeof signupSchema>
