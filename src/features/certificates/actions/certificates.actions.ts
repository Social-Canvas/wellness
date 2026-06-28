"use server"

import { revalidatePath } from "next/cache"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  getCertificateSchema,
  issueCertificateSchema,
  type GetCertificateInput,
  type IssueCertificateInput,
} from "@/features/certificates/schemas"
import {
  getCertificate,
  getMyCertificates,
  issueCertificate,
} from "@/features/certificates/services/certificates.service"
import type {
  CertificateWithCourse,
  VerifiedCertificate,
} from "@/features/certificates/types"

async function requireProfileId(): Promise<ActionResult<string>> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return profileResult
  }

  return { success: true, data: profileResult.data.id }
}

export async function issueCertificateAction(
  input: IssueCertificateInput
): Promise<ActionResult<CertificateWithCourse>> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  const parsed = issueCertificateSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  const result = await issueCertificate(profileResult.data, parsed.data)

  if (result.success) {
    revalidatePath(`/dashboard/library/${parsed.data.courseId}`)
  }

  return result
}

export async function getCertificateAction(
  input: GetCertificateInput
): Promise<ActionResult<CertificateWithCourse | null>> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  const parsed = getCertificateSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  return getCertificate(profileResult.data, parsed.data)
}

export async function getMyCertificatesAction(): Promise<
  ActionResult<CertificateWithCourse[]>
> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  return getMyCertificates(profileResult.data)
}

export type { VerifiedCertificate }
