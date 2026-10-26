export const BOT_CLASSES = ["A", "B", "C", "D"] as const

export type BotClass = (typeof BOT_CLASSES)[number]

export type BotRecommendedAction = "auto_flag_safe" | "manual_review" | "do_not_flag"

export type BotClassification = {
  class: BotClass
  reasons: string[]
  internalTest: boolean
  highConfidence: boolean
  recommendedAction: BotRecommendedAction
}

export const EXCLUDED_TEST_EMAIL_DOMAINS = ["example.com", "test.com"] as const

export const EXACT_TEST_EMAILS = [
  "e2e@elevate-healthsolutions.com",
  "smoke@elevate-healthsolutions.com",
  "playwright@elevate-healthsolutions.com",
] as const

export const TEST_LOCAL_PREFIXES = [
  "e2e-",
  "smoke-",
  "test-",
  "browser-",
  "verify-",
  "imp-",
  "raw-",
] as const

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function localPart(email: string): string {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf("@")
  return at < 0 ? normalized : normalized.slice(0, at)
}

function domainPart(email: string): string {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf("@")
  return at < 0 ? "" : normalized.slice(at + 1)
}

export function isInternalTestEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  const local = localPart(normalized)
  const domain = domainPart(normalized)

  if ((EXCLUDED_TEST_EMAIL_DOMAINS as readonly string[]).includes(domain)) {
    return true
  }
  if ((EXACT_TEST_EMAILS as readonly string[]).includes(normalized)) {
    return true
  }
  if (TEST_LOCAL_PREFIXES.some((prefix) => local.startsWith(prefix))) {
    return true
  }
  if (
    domain === "elevate-healthsolutions.com" &&
    /^(e2e|smoke|playwright|test)([+._-]|$)/.test(local)
  ) {
    return true
  }
  return false
}

/** Keep in sync with `spam-fingerprint.ts` (Node tests cannot follow extensionless imports). */
function isGeneratedAlphanumericToken(value: string | null | undefined): boolean {
  const trimmed = String(value ?? "").trim()
  return /^[A-Za-z0-9]{10}$/.test(trimmed) && /\d/.test(trimmed)
}

function extractStoredEnquiryLocation(message: string): string {
  return /^location\s*:\s*(.+)$/im.exec(message)?.[1]?.trim() ?? ""
}

function extractStoredEnquiryBody(message: string): string {
  const bodyLines: string[] = []
  for (const line of message.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const prefixed = /^message\s*:\s*(.*)$/i.exec(trimmed)
    if (prefixed) {
      if (prefixed[1]?.trim()) {
        bodyLines.push(prefixed[1].trim())
      }
      continue
    }
    if (
      /^(interest|location|preferred timing|number of attendees)\s*:/i.test(trimmed)
    ) {
      continue
    }
    bodyLines.push(trimmed)
  }
  return bodyLines.join("\n").trim()
}

function isGeneratedJunkBody(value: string): boolean {
  return (
    value.length >= 53 &&
    value.length <= 57 &&
    /^[A-Za-z0-9]+$/.test(value) &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value)
  )
}

function retreatSpamFingerprintReasons(input: {
  name?: string | null
  message?: string | null
}): string[] {
  const message = String(input.message ?? "")
  const reasons: string[] = []
  if (isGeneratedAlphanumericToken(input.name)) {
    reasons.push("generated_name")
  }
  if (isGeneratedAlphanumericToken(extractStoredEnquiryLocation(message))) {
    reasons.push("generated_location")
  }
  if (isGeneratedJunkBody(extractStoredEnquiryBody(message))) {
    reasons.push("generated_message_body")
  }
  return reasons
}

export function looksLikeNonsenseName(name: string | null | undefined): boolean {
  const trimmed = String(name ?? "").trim()
  if (!trimmed) {
    return false
  }
  const compact = trimmed.replace(/\s+/g, "")
  if (/^(.)\1{4,}$/i.test(compact)) {
    return true
  }
  if (/^(asdf|qwer|zxcv|qwerty|testtest|abcabc|loremipsum)$/i.test(compact)) {
    return true
  }
  if (/^[^a-zA-Z]*$/.test(trimmed) && trimmed.length >= 3) {
    return true
  }
  return false
}

export type AccountClassificationInput = {
  email: string
  fullName?: string | null
  certificateName?: string | null
  role?: string | null
  emailConfirmed?: boolean | null
  lastSignInAt?: string | null
  hasActivity?: boolean
  signupBurstSize?: number
  repeatNameCount?: number
}

export type LeadClassificationInput = {
  email: string
  name?: string | null
  phone?: string | null
  message?: string | null
  identicalMessageCount?: number
  repeatEmailCount?: number
  burstSize?: number
}

function withInternalTest(): BotClassification {
  return {
    class: "A",
    reasons: ["internal_test_email"],
    internalTest: true,
    highConfidence: true,
    recommendedAction: "auto_flag_safe",
  }
}

export function classifyAccount(input: AccountClassificationInput): BotClassification {
  const email = normalizeEmail(input.email)
  if (input.role === "admin" || input.role === "super_admin") {
    return {
      class: "C",
      reasons: ["operator_or_admin"],
      internalTest: false,
      highConfidence: false,
      recommendedAction: "do_not_flag",
    }
  }

  if (isInternalTestEmail(email)) {
    return withInternalTest()
  }

  const reasons: string[] = []
  if (looksLikeNonsenseName(input.fullName) || looksLikeNonsenseName(input.certificateName)) {
    reasons.push("nonsense_name")
  }
  if ((input.signupBurstSize ?? 0) >= 8) {
    reasons.push("signup_burst")
  }
  if ((input.repeatNameCount ?? 0) >= 8 && input.fullName) {
    reasons.push("repeated_full_name")
  }

  const neverConfirmed = input.emailConfirmed === false
  const neverSignedIn = !input.lastSignInAt
  const noActivity = input.hasActivity === false

  if (reasons.includes("signup_burst") && reasons.includes("nonsense_name") && neverConfirmed) {
    return {
      class: "A",
      reasons: [...reasons, "unconfirmed_generated_in_burst"],
      internalTest: false,
      highConfidence: true,
      recommendedAction: "manual_review",
    }
  }

  if (reasons.length > 0 && neverConfirmed && noActivity && neverSignedIn) {
    return {
      class: "B",
      reasons: [...reasons, "unconfirmed_no_activity_plus_heuristic"],
      internalTest: false,
      highConfidence: false,
      recommendedAction: "manual_review",
    }
  }

  if (reasons.length > 0) {
    return {
      class: "B",
      reasons,
      internalTest: false,
      highConfidence: false,
      recommendedAction: "manual_review",
    }
  }

  if (neverConfirmed && noActivity && neverSignedIn) {
    return {
      class: "D",
      reasons: ["unconfirmed_or_inactive_only_not_sufficient"],
      internalTest: false,
      highConfidence: false,
      recommendedAction: "do_not_flag",
    }
  }

  return {
    class: "C",
    reasons: ["no_bot_markers"],
    internalTest: false,
    highConfidence: false,
    recommendedAction: "do_not_flag",
  }
}

export function classifyLead(input: LeadClassificationInput): BotClassification {
  const email = normalizeEmail(input.email)
  if (isInternalTestEmail(email) || /^e2e-|smoke-|test-/i.test(String(input.name ?? ""))) {
    return {
      class: "A",
      reasons: ["internal_test_lead"],
      internalTest: true,
      highConfidence: true,
      recommendedAction: "auto_flag_safe",
    }
  }

  const fingerprintReasons = retreatSpamFingerprintReasons({
    name: input.name,
    message: input.message,
  })
  if (fingerprintReasons.length > 0) {
    return {
      class: "A",
      reasons: fingerprintReasons,
      internalTest: false,
      highConfidence: true,
      recommendedAction: "manual_review",
    }
  }

  const reasons: string[] = []
  const message = String(input.message ?? "")
  const hasUrl = /https?:\/\/|www\./i.test(message)
  if ((input.identicalMessageCount ?? 0) >= 5 && message.trim()) {
    reasons.push("identical_message_cluster")
  }
  if (hasUrl) {
    reasons.push("url_in_message")
  }
  if (looksLikeNonsenseName(input.name)) {
    reasons.push("nonsense_name")
  }
  if ((input.repeatEmailCount ?? 0) >= 4) {
    reasons.push("repeated_email")
  }
  if ((input.burstSize ?? 0) >= 5) {
    reasons.push("rapid_repeat_window")
  }

  const highConfidenceSpam =
    ((input.identicalMessageCount ?? 0) >= 5 && hasUrl) ||
    ((input.repeatEmailCount ?? 0) >= 6 && (input.burstSize ?? 0) >= 5)

  if (highConfidenceSpam) {
    return {
      class: "A",
      reasons,
      internalTest: false,
      highConfidence: true,
      recommendedAction: "manual_review",
    }
  }

  if (reasons.length > 0) {
    return {
      class: "B",
      reasons,
      internalTest: false,
      highConfidence: false,
      recommendedAction: "manual_review",
    }
  }

  return {
    class: "C",
    reasons: ["no_bot_markers"],
    internalTest: false,
    highConfidence: false,
    recommendedAction: "do_not_flag",
  }
}
