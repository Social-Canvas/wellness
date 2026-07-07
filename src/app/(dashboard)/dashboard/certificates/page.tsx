import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { CourseCertificateCard } from "@/features/certificates/components"
import { getMyCertificates } from "@/features/certificates/services/certificates.service"

export const metadata: Metadata = {
  title: "Certificates",
  description: "View certificates you have earned.",
}

export default async function DashboardCertificatesPage() {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const result = await getMyCertificates(profileResult.data.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-medium text-ink">My certificates</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Certificates appear here when you complete eligible courses.
        </p>
      </div>

      {!result.success ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      ) : result.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No certificates yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Complete a certificate-enabled course to earn your first certificate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {result.data.map((certificate) => (
            <CourseCertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>
      )}
    </div>
  )
}
