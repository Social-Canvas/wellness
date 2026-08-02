/**
 * Nonprofit partnership enquiry helpers — pure, safe for unit tests.
 * Runtime plan lookup stays in callers via membership-audience helpers.
 */

import type {
  NonprofitPlanSlug,
  NonprofitSeatPlan,
} from "../../checkout/utils/membership-audience"

export const NONPROFIT_ENQUIRY_INTENT = "nonprofit-partnership" as const

export const NONPROFIT_ENQUIRY_EYEBROW = "NONPROFIT PARTNERSHIPS" as const

export const NONPROFIT_ENQUIRY_HEADING =
  "Let’s support your organization" as const

export const NONPROFIT_ENQUIRY_DESCRIPTION =
  "Tell us a little about your nonprofit and the people you would like to support. Our team will follow up with the appropriate membership options and next steps." as const

export const NONPROFIT_ENQUIRY_FORM_HEADING =
  "Request nonprofit membership information" as const

export const NONPROFIT_ENQUIRY_FORM_SUPPORT =
  "We’ll use these details to prepare the right partnership option for your organization." as const

export const NONPROFIT_ENQUIRY_CTA =
  "Request partnership information" as const

export const NONPROFIT_ENQUIRY_NO_PURCHASE =
  "Submitting this form does not create a purchase or subscription." as const

export const NONPROFIT_ENQUIRY_SUCCESS_HEADING =
  "Thank you — your enquiry has been received" as const

export const NONPROFIT_ENQUIRY_SUCCESS_BODY =
  "The Elevate team will follow up with membership options and next steps for your organization." as const

export const NONPROFIT_ENQUIRY_PLANS_HREF =
  "/programs?membership=nonprofit#memberships" as const

export const NONPROFIT_ENQUIRY_VIEW_PLANS_LABEL =
  "View all nonprofit plans" as const

/** Compact shared benefits for the enquiry summary (not the full membership list). */
export const NONPROFIT_ENQUIRY_SUMMARY_BENEFITS = [
  "Individual member accounts",
  "Elevate course library",
  "Weekly live reset sessions",
  "Breathwork and guided practices",
  "Integration Journal",
  "Organization administrator dashboard",
] as const

export const NONPROFIT_ENQUIRY_NEXT_STEPS = [
  "Submit your organization details",
  "Elevate reviews your participant needs",
  "The team follows up with enrollment and payment options",
] as const

export const NONPROFIT_PARTICIPANT_RANGE_OPTIONS = [
  {
    value: "1-25",
    label: "1–25 participants",
    planSlug: "small" as const,
  },
  {
    value: "26-75",
    label: "26–75 participants",
    planSlug: "mid-size" as const,
  },
  {
    value: "76-200",
    label: "76–200 participants",
    planSlug: "large" as const,
  },
  {
    value: "201+",
    label: "201+ participants",
    planSlug: "enterprise" as const,
  },
] as const

export type NonprofitParticipantRange =
  (typeof NONPROFIT_PARTICIPANT_RANGE_OPTIONS)[number]["value"]

export const NONPROFIT_ACCESS_AUDIENCE_OPTIONS = [
  { value: "employees", label: "Employees" },
  { value: "volunteers", label: "Volunteers" },
  { value: "community_members", label: "Community members" },
  { value: "combination", label: "A combination" },
] as const

export type NonprofitAccessAudience =
  (typeof NONPROFIT_ACCESS_AUDIENCE_OPTIONS)[number]["value"]

export function participantRangeForPlan(
  planSlug: NonprofitPlanSlug | null | undefined
): NonprofitParticipantRange | "" {
  if (!planSlug) {
    return ""
  }
  const match = NONPROFIT_PARTICIPANT_RANGE_OPTIONS.find(
    (option) => option.planSlug === planSlug
  )
  return match?.value ?? ""
}

export function formatNonprofitPlanPrice(plan: NonprofitSeatPlan): string {
  return `${plan.priceLabel}${plan.priceSuffix}`
}

export type NonprofitEnquiryMessageInput = {
  plan: NonprofitSeatPlan | null
  organizationName: string
  organizationWebsite?: string | null
  role?: string | null
  estimatedParticipants: string
  accessAudience: NonprofitAccessAudience
  message?: string | null
}

export function composeNonprofitEnquiryMessage(
  input: NonprofitEnquiryMessageInput
): string {
  const audienceLabel =
    NONPROFIT_ACCESS_AUDIENCE_OPTIONS.find(
      (option) => option.value === input.accessAudience
    )?.label ?? input.accessAudience

  const participantLabel =
    NONPROFIT_PARTICIPANT_RANGE_OPTIONS.find(
      (option) => option.value === input.estimatedParticipants
    )?.label ?? input.estimatedParticipants

  const lines = [
    "Nonprofit partnership enquiry",
    input.plan
      ? `Selected plan: ${input.plan.name} (${input.plan.slug}) — ${input.plan.seatRangeLabel}, ${formatNonprofitPlanPrice(input.plan)}${input.plan.customPricing ? " (custom pricing)" : ""}`
      : "Selected plan: not specified (generic enquiry)",
    `Organization: ${input.organizationName}`,
  ]

  if (input.organizationWebsite?.trim()) {
    lines.push(`Website: ${input.organizationWebsite.trim()}`)
  }
  if (input.role?.trim()) {
    lines.push(`Role: ${input.role.trim()}`)
  }

  lines.push(`Estimated participants: ${participantLabel}`)
  lines.push(`Who will receive access: ${audienceLabel}`)

  if (input.message?.trim()) {
    lines.push(`Message: ${input.message.trim()}`)
  }

  return lines.join("\n")
}

export function buildNonprofitEnquiryMetadata(input: {
  plan: NonprofitSeatPlan | null
  organizationName: string
  organizationWebsite?: string | null
  role?: string | null
  estimatedParticipants: string
  accessAudience: NonprofitAccessAudience
}): Record<string, string | null> {
  return {
    intent: "nonprofit_partnership",
    planSlug: input.plan?.slug ?? null,
    planName: input.plan?.name ?? null,
    organizationName: input.organizationName,
    organizationWebsite: input.organizationWebsite?.trim() || null,
    role: input.role?.trim() || null,
    estimatedParticipants: input.estimatedParticipants,
    accessAudience: input.accessAudience,
  }
}

export function nonprofitEnquirySource(
  planSlug: NonprofitPlanSlug | null
): string {
  return planSlug
    ? `nonprofit_partnership_${planSlug}`
    : "nonprofit_partnership"
}
