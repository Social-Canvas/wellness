import { z } from "zod"

import { emailField, fullNameField, passwordField } from "./fields"

export const signupSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm your password"),
    fullName: fullNameField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignupInput = z.infer<typeof signupSchema>
