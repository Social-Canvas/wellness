import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: "Retreats",
  description: "Enquire about upcoming retreats and immersive live events.",
}

export default function RetreatsLeadPage() {
  return (
    <LeadPageShell image={BRAND_IMAGES.retreatRiver}>
      <LeadCaptureForm
        leadType="retreat"
        source="retreats_page"
        title="Retreats & Private Events"
        description="Weekend retreats and private events. Tell us what you are looking for and we will share upcoming dates and formats."
        submitLabel="Enquire about retreats"
      />
    </LeadPageShell>
  )
}
