import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: `Retreats — ${ELEVATE_BRAND.name}`,
  description:
    "Enquire about Elevate retreats — immersive breathwork, sound healing, and nervous system reset experiences.",
}

export default function RetreatsLeadPage() {
  return (
    <LeadPageShell image={BRAND_IMAGES.retreatRiver}>
      <LeadCaptureForm
        leadType="retreat"
        source="retreats_page"
        title="Retreats"
        description="Weekend retreats for deep nervous system reset, breathwork, and embodied healing. Tell us what you are looking for and we will share upcoming dates."
        submitLabel="Enquire about retreats"
      />
    </LeadPageShell>
  )
}
