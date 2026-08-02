/**
 * Shared enquiry copy and approved intent identifiers.
 * Intent values are canonical — never render arbitrary query text.
 */

export const APPROVED_LEAD_INTENTS = [
  "vip",
  "retreat",
  "private_event",
  "free_taster",
] as const

export type ApprovedLeadIntent = (typeof APPROVED_LEAD_INTENTS)[number]

export const APPROVED_ENQUIRY_INTENTS = [
  "retreat",
  "vip",
  "nonprofit-partnership",
] as const

export type ApprovedEnquiryIntent = (typeof APPROVED_ENQUIRY_INTENTS)[number]

export function isApprovedLeadIntent(
  value: string | null | undefined
): value is ApprovedLeadIntent {
  return (
    typeof value === "string" &&
    (APPROVED_LEAD_INTENTS as readonly string[]).includes(value)
  )
}

/** Soft disclaimer for enquiry forms — low visual prominence. */
export const ENQUIRY_EDUCATIONAL_DISCLAIMER =
  "Elevate content and services are educational and are not a substitute for individualized medical care." as const
