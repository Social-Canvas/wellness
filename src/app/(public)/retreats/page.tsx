import type { Metadata } from "next"

import { getCurrentUser } from "@/features/auth/services/auth.service"
import { RetreatEnquiryPage } from "@/features/leads/components/RetreatEnquiryPage"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

export const metadata: Metadata = {
  title: `Retreats — ${ELEVATE_BRAND.name}`,
  description:
    "Enquire about Elevate retreats — immersive breathwork, sound healing, and nervous system reset experiences.",
}

export default async function RetreatsLeadPage() {
  const userResult = await getCurrentUser()
  const isAuthenticated = userResult.success

  return <RetreatEnquiryPage isAuthenticated={isAuthenticated} />
}
