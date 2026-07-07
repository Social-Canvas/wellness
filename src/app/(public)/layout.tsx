import type { ReactNode } from "react"

import { Footer } from "@/components/layout/footer"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { Ticker } from "@/components/layout/ticker"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { PUBLIC_TICKER_MESSAGE } from "@/lib/constants/public-site"

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const profileResult = await getCurrentProfile()
  const isAuthenticated = profileResult.success

  return (
    <>
      <Ticker>{PUBLIC_TICKER_MESSAGE}</Ticker>
      <PublicNavbar />
      {children}
      <Footer isAuthenticated={isAuthenticated} />
    </>
  )
}
