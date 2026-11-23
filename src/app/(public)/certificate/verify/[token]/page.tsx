import type { Metadata } from "next"

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
    return { title: "Certificates are not currently offered" }
  }

  return {
    title: `${result.data.courseTitle} | Certificate Verification`,
    description: `Verify certificate ${result.data.certificateNumber}.`,
  }
}

export default async function VerifyCertificatePage({
  params,
}: VerifyCertificatePageProps) {
  const { token } = await params
  const result = await verifyCertificate({ token })

  if (!result.success) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-medium text-ink">
          Certificates are not currently offered
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          This link does not open a certificate.
        </p>
      </main>
    )
  }

  return <CertificateVerifyView certificate={result.data} />
}
