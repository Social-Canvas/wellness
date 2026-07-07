import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"

export const metadata: Metadata = {
  title: "Free Taster",
  description: "Request access to a free sample session before you choose a program.",
}

export default function FreeTasterLeadPage() {
  return (
    <LeadPageShell>
      <LeadCaptureForm
        leadType="free_taster"
        source="free_taster_page"
        title="Free Taster"
        description="Get a free sample session — public preview content with no membership required. We will email your access details."
        submitLabel="Send my free taster"
      />
    </LeadPageShell>
  )
}
