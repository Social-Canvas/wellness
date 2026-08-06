/**
 * Nonprofit partnership enquiry helpers — pure, safe for unit tests.
 * Participant estimate is enquiry information only; admins set seat limits later.
 */

export const NONPROFIT_ENQUIRY_INTENT = "nonprofit-partnership" as const

export const NONPROFIT_ENQUIRY_EYEBROW = "NONPROFIT PARTNERSHIPS" as const

export const NONPROFIT_ENQUIRY_HEADING =
  "Let’s support your organization" as const

export const NONPROFIT_ENQUIRY_DESCRIPTION =
  "Tell us a little about your nonprofit and the people you would like to support. Our team will follow up with partnership options and next steps." as const

export const NONPROFIT_ENQUIRY_FORM_HEADING =
  "Request nonprofit membership information" as const

export const NONPROFIT_ENQUIRY_FORM_SUPPORT =
  "We’ll use these details to prepare a partnership proposal. Seat limits are confirmed after approval and payment." as const

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
  "Back to nonprofit memberships" as const

/** Compact shared benefits for the enquiry summary. */
export const NONPROFIT_ENQUIRY_SUMMARY_BENEFITS = [
  "Platinum-equivalent sponsored access",
  "Individual participant accounts",
  "Elevate course and recorded-session library",
  "Live virtual classes",
  "Integration Journal",
  "Organization administrator dashboard",
] as const

export const NONPROFIT_ENQUIRY_NEXT_STEPS = [
  "Submit organization details",
  "Elevate reviews the organization’s needs",
  "Terms, payment, and seat allowance are confirmed",
  "The organization receives onboarding and access instructions",
] as const

export const NONPROFIT_PARTICIPANT_RANGE_OPTIONS = [
  {
    value: "1-25",
    label: "1–25 participants",
  },
  {
    value: "26-75",
    label: "26–75 participants",
  },
  {
    value: "76-200",
    label: "76–200 participants",
  },
  {
    value: "201+",
    label: "201+ participants",
  },
  {
    value: "not-sure",
    label: "Not sure yet",
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

export type NonprofitEnquiryMessageInput = {
  organizationName: string
  organizationWebsite?: string | null
  role?: string | null
  estimatedParticipants: string
  accessAudience: NonprofitAccessAudience
  partnershipNotes?: string | null
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

  if (input.partnershipNotes?.trim()) {
    lines.push(
      `Preferred partnership or billing notes: ${input.partnershipNotes.trim()}`
    )
  }

  if (input.message?.trim()) {
    lines.push(`Message: ${input.message.trim()}`)
  }

  return lines.join("\n")
}

export function buildNonprofitEnquiryMetadata(input: {
  organizationName: string
  organizationWebsite?: string | null
  role?: string | null
  estimatedParticipants: string
  accessAudience: NonprofitAccessAudience
  partnershipNotes?: string | null
}): Record<string, string | null> {
  return {
    intent: "nonprofit_partnership",
    organizationName: input.organizationName,
    organizationWebsite: input.organizationWebsite?.trim() || null,
    role: input.role?.trim() || null,
    estimatedParticipants: input.estimatedParticipants,
    accessAudience: input.accessAudience,
    partnershipNotes: input.partnershipNotes?.trim() || null,
  }
}

export function nonprofitEnquirySource(): string {
  return "nonprofit_partnership"
}
