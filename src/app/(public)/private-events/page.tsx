import type { Metadata } from "next"

import { LeadCaptureForm } from "@/features/leads/components/LeadCaptureForm"
import { LeadPageShell } from "@/features/leads/components/LeadPageShell"
import {
  NONPROFIT_SEAT_PLANS,
  parseNonprofitPlanParam,
} from "@/features/checkout/utils/membership-audience"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: `Private Events — ${ELEVATE_BRAND.name}`,
  description:
    "Enquire about private breathwork, sound healing, and bespoke Elevate events.",
}

type PrivateEventsPageProps = {
  searchParams: Promise<{
    intent?: string | string[]
    plan?: string | string[]
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
  const planSlug = parseNonprofitPlanParam(params.plan)
  const isNonprofitInquiry = intent === "nonprofit-partnership"
  const selectedPlan = planSlug
    ? NONPROFIT_SEAT_PLANS.find((plan) => plan.slug === planSlug)
    : undefined

  const title = isNonprofitInquiry
    ? "Nonprofit partnership enquiry"
    : "Private Events"

  const description = isNonprofitInquiry
    ? selectedPlan
      ? `You selected ${selectedPlan.name} (${selectedPlan.seatRangeLabel}, ${selectedPlan.priceLabel}${selectedPlan.priceSuffix.replace(" · custom", "")}). Tell us about your organization and we will follow up with a partnership proposal — this is not a Checkout purchase.`
      : "Tell us about your nonprofit, approximate team or community size, and partnership goals. We will follow up with a proposal — this is not a Checkout purchase."
    : "Planning a private breathwork, sound bath, or Elevate experience for your group? Send an enquiry and we will follow up with availability."

  const source = isNonprofitInquiry
    ? selectedPlan
      ? `nonprofit_partnership_${selectedPlan.slug}`
      : "nonprofit_partnership"
    : "private_events_page"

  const submitLabel = isNonprofitInquiry
    ? "Request nonprofit partnership information"
    : "Enquire about private events"

  return (
    <LeadPageShell image={BRAND_IMAGES.retreatSpiritual}>
      <LeadCaptureForm
        leadType="private_event"
        source={source}
        title={title}
        description={description}
        submitLabel={submitLabel}
      />
    </LeadPageShell>
  )
}
