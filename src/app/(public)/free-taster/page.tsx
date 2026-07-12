import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: `Free Taster — ${ELEVATE_BRAND.name}`,
  description:
    "Sample Elevate breathwork and nervous system regulation before you choose a membership or program.",
}

export default function FreeTasterLeadPage() {
  return (
    <LeadPageShell image={BRAND_IMAGES.heroBreathwork}>
      <LeadCaptureForm
        leadType="free_taster"
        source="free_taster_page"
        title="Free Taster"
        description="Experience a sample of Elevate breathwork — no membership required. We will email your access details."
        submitLabel="Send my free taster"
      />
    </LeadPageShell>
  )
}
