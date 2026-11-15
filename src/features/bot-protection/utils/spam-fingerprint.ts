/**
 * High-confidence retreat-form spam fingerprint.
 *
 * Production campaign (Sep 2026): all 44 /retreats leads used a 10-character
 * alphanumeric name, a 10-character alphanumeric location, and a ~55-character
 * letters+digits message body with no spaces. Digit-leading "names" were common.
 *
 * Keep this conservative. Real names with spaces ("Jane Smith") and ordinary
 * place names ("Rishikesh") must pass.
 */

export const GENERATED_TOKEN_LENGTH = 10
export const JUNK_BODY_LENGTH = 55
export const JUNK_BODY_LENGTH_TOLERANCE = 2

export const SPAM_FINGERPRINT_USER_ERROR =
  "Unable to submit your request right now. Please try again."

export type SpamFingerprintReason =
  | "generated_name"
  | "generated_location"
  | "generated_message_body"

export type SpamFingerprintMatch = {
  matched: boolean
  reasons: SpamFingerprintReason[]
}

const STRUCTURED_PREFIX =
  /^(interest|location|preferred timing|number of attendees|organization|website|role|estimated participants|who will receive access|preferred partnership or billing notes|nonprofit partnership enquiry)\s*:/i

const MESSAGE_PREFIX = /^message\s*:\s*(.*)$/i
const LOCATION_LINE = /^location\s*:\s*(.+)$/im

function trimOrEmpty(value: string | null | undefined): string {
  return String(value ?? "").trim()
}

export function isGeneratedAlphanumericToken(
  value: string | null | undefined
): boolean {
  const trimmed = trimOrEmpty(value)
  if (trimmed.length !== GENERATED_TOKEN_LENGTH) {
    return false
  }
  if (/\s/.test(trimmed)) {
    return false
  }
  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return false
  }
  // Require a digit so 10-letter real names (e.g. Maximilian) are not blocked.
  // Digit-leading tokens from the campaign always match.
  return /\d/.test(trimmed)
}

export function isGeneratedJunkBody(
  value: string | null | undefined
): boolean {
  const trimmed = trimOrEmpty(value)
  const min = JUNK_BODY_LENGTH - JUNK_BODY_LENGTH_TOLERANCE
  const max = JUNK_BODY_LENGTH + JUNK_BODY_LENGTH_TOLERANCE
  if (trimmed.length < min || trimmed.length > max) {
    return false
  }
  if (/\s/.test(trimmed)) {
    return false
  }
  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return false
  }
  return /[A-Za-z]/.test(trimmed) && /\d/.test(trimmed)
}

export function extractEnquiryLocation(input: {
  message?: string | null
  metadata?: Record<string, unknown> | null
}): string {
  const fromMeta = input.metadata?.location
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim()
  }
  const match = LOCATION_LINE.exec(String(input.message ?? ""))
  return match?.[1]?.trim() ?? ""
}

/**
 * User-typed body only. Strips Interest:/Location: (and similar) prefixes that
 * `composeRetreatEnquiryMessage` adds before persistence.
 */
export function extractUserTypedEnquiryBody(
  message: string | null | undefined
): string {
  const text = trimOrEmpty(message)
  if (!text) {
    return ""
  }

  const bodyLines: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const messagePrefix = MESSAGE_PREFIX.exec(trimmed)
    if (messagePrefix) {
      const rest = messagePrefix[1]?.trim()
      if (rest) {
        bodyLines.push(rest)
      }
      continue
    }
    if (STRUCTURED_PREFIX.test(trimmed)) {
      continue
    }
    bodyLines.push(trimmed)
  }

  return bodyLines.join("\n").trim()
}

export function evaluateEnquirySpamFingerprint(input: {
  name?: string | null
  message?: string | null
  metadata?: Record<string, unknown> | null
}): SpamFingerprintMatch {
  const reasons: SpamFingerprintReason[] = []
  const location = extractEnquiryLocation(input)
  const body = extractUserTypedEnquiryBody(input.message)

  if (isGeneratedAlphanumericToken(input.name)) {
    reasons.push("generated_name")
  }
  if (isGeneratedAlphanumericToken(location)) {
    reasons.push("generated_location")
  }
  if (isGeneratedJunkBody(body)) {
    reasons.push("generated_message_body")
  }

  return { matched: reasons.length > 0, reasons }
}
