import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { CertificateNameOnboardingForm } from "@/features/auth/components/CertificateNameOnboardingForm"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  isCertificateNameLocked,
  resolveCertificateNameNextPath,
} from "@/features/auth/utils/certificate-name"

export const metadata: Metadata = {
  title: "Confirm certificate name",
  description: "Confirm the exact name that will appear on your certificates.",
}

type CertificateNamePageProps = {
  searchParams: Promise<{ next?: string | string[] }>
}

export default async function CertificateNamePage({
  searchParams,
}: CertificateNamePageProps) {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const params = await searchParams
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next
  const nextPath = resolveCertificateNameNextPath(nextRaw)

  if (isCertificateNameLocked(profileResult.data)) {
    redirect(nextPath)
  }

  return <CertificateNameOnboardingForm nextPath={nextPath} />
}
