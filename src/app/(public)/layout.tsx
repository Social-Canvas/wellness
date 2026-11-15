import type { ReactNode } from "react"

import { Footer } from "@/components/layout/footer"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { Ticker } from "@/components/layout/ticker"
import { PublicDisclaimerGate } from "@/components/marketing/modals"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { readSiteText } from "@/features/site-content/resolve"
import { loadSiteContent } from "@/features/site-content/services/site-content.service"

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [profileResult, content] = await Promise.all([
    getCurrentProfile(),
    loadSiteContent(),
  ])
  const isAuthenticated = profileResult.success
  const announcement = readSiteText(content, "homepage.announcement", "").trim()

  return (
    <>
      {announcement ? <Ticker>{announcement}</Ticker> : null}
      <PublicNavbar />
      {children}
      <Footer isAuthenticated={isAuthenticated} />
      <PublicDisclaimerGate />
    </>
  )
}
