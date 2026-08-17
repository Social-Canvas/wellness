import type { Metadata } from "next"

import { getCurrentUser } from "@/features/auth/services/auth.service"
import { VipEnquiryPage } from "@/features/leads/components/VipEnquiryPage"
import { buildPublicPageMetadata } from "@/lib/seo/site-seo"

export const metadata: Metadata = buildPublicPageMetadata({
  title: "VIP Coaching",
  description:
    "Apply for high-touch VIP coaching with Dr. Deepa Pattani: functional medicine, breathwork, and nervous system transformation.",
  path: "/vip",
})

export default async function VipLeadPage() {
  const userResult = await getCurrentUser()
  const isAuthenticated = userResult.success

  return <VipEnquiryPage isAuthenticated={isAuthenticated} />
}
