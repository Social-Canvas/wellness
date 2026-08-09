import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"
import { NonprofitPartnershipEnquiryPage } from "@/features/leads/components/NonprofitPartnershipEnquiryPage"
import { NONPROFIT_ENQUIRY_INTENT } from "@/features/leads/utils/nonprofit-enquiry"
import { getCurrentUser } from "@/features/auth/services/auth.service"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: `Private Events | ${ELEVATE_BRAND.name}`,
  description:
    "Enquire about private breathwork, sound healing, and bespoke Elevate events.",
}

type PrivateEventsPageProps = {
  searchParams: Promise<{
    intent?: string | string[]
  }>
}

function firstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function PrivateEventsLeadPage({
  searchParams,
}: PrivateEventsPageProps) {
  const params = await searchParams
  const intent = firstParam(params.intent)
  const isNonprofitInquiry = intent === NONPROFIT_ENQUIRY_INTENT

  if (isNonprofitInquiry) {
    const userResult = await getCurrentUser()
    const isAuthenticated = userResult.success

    return (
      <NonprofitPartnershipEnquiryPage isAuthenticated={isAuthenticated} />
    )
  }

  return (
    <LeadPageShell image={BRAND_IMAGES.retreatSpiritual}>
      <LeadCaptureForm
        leadType="private_event"
        source="private_events_page"
        title="Private Events"
        description="Planning a private breathwork, sound bath, or Elevate experience for your group? Send an enquiry and we will follow up with availability."
        submitLabel="Enquire about private events"
      />
    </LeadPageShell>
  )
}
