"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  adminCorrectCertificateName,
  adminReissueCertificateRecipientName,
  setCertificateNameOnce,
} from "@/features/auth/services/certificate-name.service"
import type {
  AdminCorrectCertificateNameInput,
  AdminReissueCertificateInput,
  SetCertificateNameOnceInput,
} from "@/features/auth/schemas"
import type { CertificateNameSetSource } from "@/features/auth/utils/certificate-name"

export async function setCertificateNameOnceAction(
  input: SetCertificateNameOnceInput
): Promise<
  ActionResult<{ certificateName: string; setSource: CertificateNameSetSource }>
> {
  const result = await setCertificateNameOnce(input)

  if (result.success) {
    revalidatePath("/", "layout")
  }

  return result
}

export async function adminCorrectCertificateNameAction(
  input: AdminCorrectCertificateNameInput
): Promise<
  ActionResult<{ previousName: string | null; newName: string; profileId: string }>
> {
  const result = await adminCorrectCertificateName(input)

  if (result.success) {
    revalidatePath("/admin/members")
  }

  return result
}

export async function adminReissueCertificateAction(
  input: AdminReissueCertificateInput
): Promise<ActionResult<{ certificateId: string; recipientName: string }>> {
  const result = await adminReissueCertificateRecipientName(input)

  if (result.success) {
    revalidatePath("/admin/members")
    revalidatePath("/dashboard/certificates")
  }

  return result
}
