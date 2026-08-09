import type { Metadata } from "next"

import { getCurrentUser } from "@/features/auth/services/auth.service"
import { RetreatsLandingPage } from "@/features/retreats/components/RetreatsLandingPage"
import { RETREATS_PAGE } from "@/features/retreats/constants/retreats-page"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://elevate-healthsolutions.com"

export const metadata: Metadata = {
  title: `${RETREATS_PAGE.metaTitle} | ${ELEVATE_BRAND.name}`,
  description: RETREATS_PAGE.metaDescription,
  alternates: {
    canonical: "/retreats",
  },
  openGraph: {
    title: `${RETREATS_PAGE.metaTitle} | ${ELEVATE_BRAND.name}`,
    description: RETREATS_PAGE.metaDescription,
    url: `${siteUrl}/retreats`,
    type: "website",
    images: [
      {
        url: "/brand/retreat-river.png",
        alt: "Group meditation at sunrise beside a tranquil river during a wellness retreat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${RETREATS_PAGE.metaTitle} | ${ELEVATE_BRAND.name}`,
    description: RETREATS_PAGE.metaDescription,
    images: ["/brand/retreat-river.png"],
  },
}

export default async function RetreatsPage() {
  const userResult = await getCurrentUser()
  const isAuthenticated = userResult.success

  return <RetreatsLandingPage isAuthenticated={isAuthenticated} />
}
