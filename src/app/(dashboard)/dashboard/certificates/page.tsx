import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"

export const metadata: Metadata = {
  title: "Certificates",
  description: "Certificates are not currently offered.",
  robots: { index: false, follow: false },
}

export default async function DashboardCertificatesPage() {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login?next=/dashboard/certificates")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-medium text-ink">Certificates</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Certificates are not currently offered. Your courses, downloads, and
          sessions stay in My Library.
        </p>
      </div>
      <Link
        href="/dashboard/library"
        className="inline-flex text-sm font-semibold text-blue hover:text-blue-deep"
      >
        Go to My Library
      </Link>
    </div>
  )
}
