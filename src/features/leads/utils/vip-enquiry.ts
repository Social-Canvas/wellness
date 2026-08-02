export const VIP_ENQUIRY_INTENT = "vip" as const
export const VIP_ENQUIRY_SOURCE = "vip_page" as const

export const VIP_ENQUIRY_EYEBROW = "VIP COACHING" as const

export const VIP_ENQUIRY_HEADING =
  "Personalized support for deeper transformation" as const

export const VIP_ENQUIRY_DESCRIPTION =
  "Explore a high-touch coaching experience with Dr. Deepa Pattani, shaped around your goals and the level of support you need." as const

export const VIP_ENQUIRY_SUMMARY_HEADING =
  "A personalized coaching enquiry" as const

export const VIP_ENQUIRY_SUMMARY_BENEFITS = [
  "Private, individualized support",
  "Breathwork and nervous-system practices",
  "A plan shaped around your goals",
  "Follow-up regarding fit and availability",
] as const

export const VIP_ENQUIRY_NEXT_STEPS = [
  "Share your goals",
  "The Elevate team reviews your enquiry",
  "You receive next-step and availability information",
] as const

export const VIP_ENQUIRY_FORM_HEADING = "Enquire about VIP Coaching" as const

export const VIP_ENQUIRY_FORM_SUPPORT =
  "Share a few details so the Elevate team can understand your goals and discuss the most appropriate next step." as const

export const VIP_ENQUIRY_CTA = "Enquire about VIP Coaching" as const

export const VIP_ENQUIRY_NO_PURCHASE =
  "Submitting an enquiry does not create a coaching agreement or purchase." as const

export const VIP_ENQUIRY_SUCCESS_HEADING =
  "Thank you — your VIP Coaching enquiry has been received" as const

export const VIP_ENQUIRY_SUCCESS_BODY =
  "The Elevate team will review your enquiry and follow up regarding fit, availability and next steps." as const

export const VIP_ENQUIRY_MESSAGE_LABEL =
  "What would you like support with? — optional" as const

export function buildVipEnquiryMetadata(): Record<string, string | null> {
  return {
    intent: VIP_ENQUIRY_INTENT,
  }
}
