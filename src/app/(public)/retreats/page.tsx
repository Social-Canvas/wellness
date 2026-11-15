import type { Metadata } from "next"

import { getCurrentUser } from "@/features/auth/services/auth.service"
import { RetreatsLandingPage } from "@/features/retreats/components/RetreatsLandingPage"
import { RETREATS_PAGE } from "@/features/retreats/constants/retreats-page"
import { readSiteText } from "@/features/site-content/resolve"
import { loadSiteContent } from "@/features/site-content/services/site-content.service"
import { buildPublicPageMetadata } from "@/lib/seo/site-seo"

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSiteContent()
  return buildPublicPageMetadata({
    title: RETREATS_PAGE.metaTitle,
    description: readSiteText(content, "retreats.seo.description", RETREATS_PAGE.metaDescription),
    path: "/retreats",
    image: {
      url: "/brand/retreat-river.png",
      alt: "Group meditation at sunrise beside a tranquil river during a wellness retreat",
    },
  })
}

export default async function RetreatsPage() {
  const [userResult, content] = await Promise.all([getCurrentUser(), loadSiteContent()])
  const isAuthenticated = userResult.success

  return (
    <RetreatsLandingPage
      isAuthenticated={isAuthenticated}
      hero={{
        heading: readSiteText(content, "retreats.hero.heading", RETREATS_PAGE.hero.heading),
        body: readSiteText(content, "retreats.hero.body", RETREATS_PAGE.hero.body),
        primaryLabel: readSiteText(
          content,
          "retreats.hero.primary_cta",
          RETREATS_PAGE.hero.primaryCta.label
        ),
        secondaryLabel: readSiteText(
          content,
          "retreats.hero.secondary_cta",
          RETREATS_PAGE.hero.secondaryCta.label
        ),
      }}
    />
  )
}
