import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CertificateVerifyView } from "@/features/certificates/components"
import { verifyCertificate } from "@/features/certificates/services/certificates.service"

interface VerifyCertificatePageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params,
}: VerifyCertificatePageProps): Promise<Metadata> {
  const { token } = await params
  const result = await verifyCertificate({ token })

  if (!result.success) {
    return { title: "Certificate not found" }
  }

  return {
    title: `${result.data.courseTitle} — Certificate Verification`,
    description: `Verify certificate ${result.data.certificateNumber}.`,
  }
}

export default async function VerifyCertificatePage({
  params,
}: VerifyCertificatePageProps) {
  const { token } = await params
  const result = await verifyCertificate({ token })

  if (!result.success) {
    notFound()
  }

  return <CertificateVerifyView certificate={result.data} />
}
