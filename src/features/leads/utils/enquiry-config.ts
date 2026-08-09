import { z } from "zod"

const emailAddressSchema = z.email()

/**
 * Server-only enquiry admin notification recipient.
 * Optional so local builds do not require it; missing value is handled at runtime.
 */
export function getEnquiryNotificationTo(): string | null {
  const raw = process.env.ENQUIRY_NOTIFICATION_TO?.trim()
  if (!raw) {
    return null
  }
  const normalized = raw.toLowerCase()
  if (!emailAddressSchema.safeParse(normalized).success) {
    return null
  }
  return normalized
}
