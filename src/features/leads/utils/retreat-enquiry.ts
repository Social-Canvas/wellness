export const RETREAT_ENQUIRY_INTENT = "retreat" as const
export const RETREAT_ENQUIRY_SOURCE = "retreats_page" as const

export const RETREAT_ENQUIRY_EYEBROW = "ELEVATE RETREATS" as const

export const RETREAT_ENQUIRY_HEADING = "Step away. Reset deeply." as const

export const RETREAT_ENQUIRY_DESCRIPTION =
  "Join an immersive Elevate retreat designed for nervous-system restoration, guided breathwork and meaningful reconnection." as const

export const RETREAT_ENQUIRY_SUMMARY_HEADING = "Retreat interest" as const

export const RETREAT_ENQUIRY_SUMMARY_BENEFITS = [
  "Restorative group experience",
  "Guided breathwork and reflection",
  "Nervous-system support practices",
  "Connection with the Elevate community",
  "Upcoming dates shared when confirmed",
] as const

export const RETREAT_ENQUIRY_NEXT_STEPS = [
  "Share your interest",
  "Elevate reviews your preferences",
  "The team contacts you when a suitable retreat is available",
] as const

export const RETREAT_ENQUIRY_FORM_HEADING = "Ask for more information" as const

export const RETREAT_ENQUIRY_FORM_SUPPORT =
  "Tell us what you are looking for. The Elevate team will follow up when suitable information is available." as const

export const RETREAT_ENQUIRY_CTA = "Ask for more information" as const

export const RETREAT_ENQUIRY_NO_PURCHASE =
  "Submitting this form does not reserve a place or create a purchase." as const

export const RETREAT_ENQUIRY_SUCCESS_HEADING =
  "Thank you. Your retreat enquiry has been received" as const

export const RETREAT_ENQUIRY_SUCCESS_BODY =
  "The Elevate team will review your interest and follow up when suitable retreat information is available." as const

export const RETREAT_INTEREST_OPTIONS = [
  { value: "", label: "Select an option" },
  { value: "rishikesh-2027", label: "Rishikesh 2027" },
  { value: "future-retreats", label: "Future retreats" },
  { value: "private-event", label: "Private event" },
] as const

export type RetreatInterestValue =
  (typeof RETREAT_INTEREST_OPTIONS)[number]["value"]

/** @deprecated Prefer RETREAT_INTEREST_OPTIONS on the landing form. */
export const RETREAT_PREFERRED_TIMING_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
  { value: "flexible", label: "Flexible / whenever available" },
] as const

export type RetreatPreferredTiming =
  (typeof RETREAT_PREFERRED_TIMING_OPTIONS)[number]["value"]

export function composeRetreatEnquiryMessage(input: {
  message?: string | null
  interest?: string | null
  location?: string | null
  preferredTiming?: string | null
  attendeeCount?: string | null
}): string | null {
  const lines: string[] = []

  if (input.interest?.trim()) {
    const interestLabel =
      RETREAT_INTEREST_OPTIONS.find((option) => option.value === input.interest)
        ?.label ?? input.interest.trim()
    lines.push(`Interest: ${interestLabel}`)
  }

  if (input.location?.trim()) {
    lines.push(`Location: ${input.location.trim()}`)
  }

  if (input.preferredTiming?.trim()) {
    const timingLabel =
      RETREAT_PREFERRED_TIMING_OPTIONS.find(
        (option) => option.value === input.preferredTiming
      )?.label ?? input.preferredTiming.trim()
    lines.push(`Preferred timing: ${timingLabel}`)
  }

  if (input.attendeeCount?.trim()) {
    lines.push(`Number of attendees: ${input.attendeeCount.trim()}`)
  }

  if (input.message?.trim()) {
    lines.push(input.message.trim())
  }

  if (lines.length === 0) {
    return null
  }

  return lines.join("\n")
}

export function buildRetreatEnquiryMetadata(input: {
  interest?: string | null
  location?: string | null
  preferredTiming?: string | null
  attendeeCount?: string | null
}): Record<string, string | null> {
  return {
    intent: RETREAT_ENQUIRY_INTENT,
    interest: input.interest?.trim() || null,
    location: input.location?.trim() || null,
    preferredTiming: input.preferredTiming?.trim() || null,
    attendeeCount: input.attendeeCount?.trim() || null,
  }
}
