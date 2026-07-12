import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: `VIP Coaching — ${ELEVATE_BRAND.name}`,
  description:
    "Apply for high-touch VIP coaching with Dr. Deepa Pattani — functional medicine, breathwork, and nervous system transformation.",
}

export default function VipLeadPage() {
  return (
    <LeadPageShell image={BRAND_IMAGES.founderCoachingTreePose}>
      <LeadCaptureForm
        leadType="vip"
        source="vip_page"
        title="VIP Coaching"
        description="A bespoke transformation path with Dr. Deepa Pattani — blending functional medicine, breathwork, and nervous system regulation. Share your details and our team will follow up to design your plan."
        submitLabel="Apply for VIP coaching"
      />
    </LeadPageShell>
  )
}
