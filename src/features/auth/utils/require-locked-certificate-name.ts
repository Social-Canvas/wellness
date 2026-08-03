import { redirect } from "next/navigation"

import { isCertificateNameLocked } from "@/features/auth/utils/certificate-name"
import type { ProfileView } from "@/features/auth/services/auth.service"

/**
 * Central gate: authenticated users without a locked certificate name must
 * complete /certificate-name before member or admin pages.
 */
export function requireLockedCertificateName(
  profile: ProfileView,
  requestedPath: string
): void {
  if (isCertificateNameLocked(profile)) {
    return
  }

  const next =
    requestedPath.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/dashboard/library"

  redirect(`/certificate-name?next=${encodeURIComponent(next)}`)
}
