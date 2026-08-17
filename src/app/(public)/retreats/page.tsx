import type { Metadata } from "next"

import { getCurrentUser } from "@/features/auth/services/auth.service"
import { RetreatsLandingPage } from "@/features/retreats/components/RetreatsLandingPage"
import { RETREATS_PAGE } from "@/features/retreats/constants/retreats-page"
import { buildPublicPageMetadata } from "@/lib/seo/site-seo"

export const metadata: Metadata = buildPublicPageMetadata({
  title: RETREATS_PAGE.metaTitle,
  description: RETREATS_PAGE.metaDescription,
  path: "/retreats",
  image: {
    url: "/brand/retreat-river.png",
    alt: "Group meditation at sunrise beside a tranquil river during a wellness retreat",
  },
})

export default async function RetreatsPage() {
  const userResult = await getCurrentUser()
  const isAuthenticated = userResult.success

  return <RetreatsLandingPage isAuthenticated={isAuthenticated} />
}
