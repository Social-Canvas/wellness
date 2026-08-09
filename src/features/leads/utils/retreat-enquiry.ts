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

export const RETREAT_ENQUIRY_FORM_HEADING =
  "Enquire about an Elevate retreat" as const

export const RETREAT_ENQUIRY_FORM_SUPPORT =
  "Tell us what you are looking for, and the Elevate team will share suitable upcoming opportunities." as const

export const RETREAT_ENQUIRY_CTA = "Enquire about retreats" as const

export const RETREAT_ENQUIRY_NO_PURCHASE =
  "Submitting this form does not reserve a place or create a purchase." as const

export const RETREAT_ENQUIRY_SUCCESS_HEADING =
  "Thank you. Your retreat enquiry has been received" as const

export const RETREAT_ENQUIRY_SUCCESS_BODY =
  "The Elevate team will review your interest and follow up when suitable retreat information is available." as const

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
  preferredTiming?: string | null
  attendeeCount?: string | null
}): string | null {
  const lines: string[] = []

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
  preferredTiming?: string | null
  attendeeCount?: string | null
}): Record<string, string | null> {
  return {
    intent: RETREAT_ENQUIRY_INTENT,
    preferredTiming: input.preferredTiming?.trim() || null,
    attendeeCount: input.attendeeCount?.trim() || null,
  }
}
