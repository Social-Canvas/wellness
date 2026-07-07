import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"

export const metadata: Metadata = {
  title: "VIP Package",
  description: "Apply to enquire about the VIP transformation package.",
}

export default function VipLeadPage() {
  return (
    <LeadPageShell>
      <LeadCaptureForm
        leadType="vip"
        source="vip_page"
        title="VIP Package"
        description="Custom high-touch transformation program. Share your details and our team will follow up to design your plan."
        submitLabel="Apply for VIP"
      />
    </LeadPageShell>
  )
}
