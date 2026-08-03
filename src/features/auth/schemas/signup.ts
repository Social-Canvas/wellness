import { z } from "zod"

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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignupInput = z.infer<typeof signupSchema>
