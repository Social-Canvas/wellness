import { z } from "zod"

import {
  CERTIFICATE_NAME_MAX_LENGTH,
  CERTIFICATE_NAME_MIN_LENGTH,
  normalizeCertificateName,
  validateCertificateName,
} from "../utils/certificate-name"

export const certificateNameField = z
  .string()
  .transform((value) => normalizeCertificateName(value))
  .superRefine((value, ctx) => {
    const result = validateCertificateName(value)
    if (!result.ok) {
      ctx.addIssue({
        code: "custom",
        message: result.message,
      })
    }
  })
  .pipe(
    z
      .string()
      .min(CERTIFICATE_NAME_MIN_LENGTH)
      .max(CERTIFICATE_NAME_MAX_LENGTH)
  )

export const certificateNameConfirmField = z.literal(true, {
  error:
    "Please confirm that this spelling is correct and will appear on your certificates.",
})

export const setCertificateNameOnceSchema = z.object({
  certificateName: certificateNameField,
  confirmSpelling: certificateNameConfirmField,
  source: z.enum(["signup", "onboarding"]),
})

export type SetCertificateNameOnceInput = z.infer<
  typeof setCertificateNameOnceSchema
>

export const adminCorrectCertificateNameSchema = z.object({
  profileId: z.uuid("Invalid member id."),
  certificateName: certificateNameField,
  reason: z
    .string()
    .trim()
    .min(3, "Provide a correction reason (at least 3 characters).")
    .max(500, "Reason is too long."),
  confirmCorrection: z.literal(true, {
    error: "Confirm that you intend to correct this certificate name.",
  }),
})

export type AdminCorrectCertificateNameInput = z.infer<
  typeof adminCorrectCertificateNameSchema
>

export const adminReissueCertificateSchema = z.object({
  certificateId: z.uuid("Invalid certificate id."),
  reason: z
    .string()
    .trim()
    .min(3, "Provide a reissue reason (at least 3 characters).")
    .max(500, "Reason is too long."),
  confirmReissue: z.literal(true, {
    error: "Confirm that you intend to reissue this certificate snapshot.",
  }),
})

export type AdminReissueCertificateInput = z.infer<
  typeof adminReissueCertificateSchema
>
