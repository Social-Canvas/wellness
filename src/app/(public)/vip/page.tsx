import type { Metadata } from "next"

import { getCurrentUser } from "@/features/auth/services/auth.service"
import { VipEnquiryPage } from "@/features/leads/components/VipEnquiryPage"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

export const metadata: Metadata = {
  title: `VIP Coaching | ${ELEVATE_BRAND.name}`,
  description:
    "Apply for high-touch VIP coaching with Dr. Deepa Pattani: functional medicine, breathwork, and nervous system transformation.",
}

export default async function VipLeadPage() {
  const userResult = await getCurrentUser()
  const isAuthenticated = userResult.success

  return <VipEnquiryPage isAuthenticated={isAuthenticated} />
}
