import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"

export const metadata: Metadata = {
  title: "Private Events",
  description: "Enquire about private wellness events and bespoke sessions.",
}

export default function PrivateEventsLeadPage() {
  return (
    <LeadPageShell>
      <LeadCaptureForm
        leadType="private_event"
        source="private_events_page"
        title="Private Events"
        description="Planning a private breathwork, sound bath, or wellness event? Send an enquiry and we will follow up with availability."
        submitLabel="Enquire about private events"
      />
    </LeadPageShell>
  )
}
