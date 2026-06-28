import { z } from "zod"

export const issueCertificateSchema = z.object({
  courseId: z.uuid("Invalid course id."),
})

export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>

export const getCertificateSchema = z.object({
  courseId: z.uuid("Invalid course id."),
})

export type GetCertificateInput = z.infer<typeof getCertificateSchema>

export const verifyCertificateSchema = z.object({
  token: z
    .string()
    .trim()
    .min(16, "Invalid verification token.")
    .max(128, "Invalid verification token."),
})

export type VerifyCertificateInput = z.infer<typeof verifyCertificateSchema>
