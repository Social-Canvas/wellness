import type { ReactNode } from "react"

import { Footer } from "@/components/layout/footer"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { PublicDisclaimerGate } from "@/components/marketing/modals"
import { getCurrentProfile } from "@/features/auth/services/auth.service"

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const profileResult = await getCurrentProfile()
  const isAuthenticated = profileResult.success

  return (
    <>
      <PublicNavbar />
      {children}
      <Footer isAuthenticated={isAuthenticated} />
      <PublicDisclaimerGate />
    </>
  )
}
