import type { Metadata } from "next"

import { getCurrentUser } from "@/features/auth/services/auth.service"
import { RetreatsLandingPage } from "@/features/retreats/components/RetreatsLandingPage"
import { RETREATS_PAGE } from "@/features/retreats/constants/retreats-page"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

export const metadata: Metadata = {
  title: `${RETREATS_PAGE.metaTitle} | ${ELEVATE_BRAND.name}`,
  description: RETREATS_PAGE.metaDescription,
  alternates: {
    canonical: "/retreats",
  },
}

export default async function RetreatsPage() {
  const userResult = await getCurrentUser()
  const isAuthenticated = userResult.success

  return <RetreatsLandingPage isAuthenticated={isAuthenticated} />
}
