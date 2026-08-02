import { z } from "zod"

const emailAddressSchema = z.email()

export type TransactionalEmailRuntimeConfig = {
  apiKeyPresent: boolean
  fromAddress: string | null
  fromName: string
  replyTo: string | null
  deliveryEnabled: boolean
  testRecipientAllowlist: string[]
  appUrl: string
  isProduction: boolean
  batchSize: number
  maxAttempts: number
  /** When true, non-allowlisted recipients are blocked even in production (safety kill-switch for tests). */
  requireAllowlist: boolean
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") {
    return defaultValue
  }
  const normalized = value.trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false
  }
  return defaultValue
}

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => emailAddressSchema.safeParse(entry).success)
}

function parseFromAddress(raw: string | undefined): string | null {
  if (!raw?.trim()) {
    return null
  }
  const trimmed = raw.trim()
  // Accept "Name <email@domain>" or bare email
  const angleMatch = trimmed.match(/<([^>]+)>$/)
  const email = (angleMatch?.[1] ?? trimmed).trim().toLowerCase()
  if (!emailAddressSchema.safeParse(email).success) {
    return null
  }
  return email
}

function parseFromDisplay(raw: string | undefined, email: string | null): string {
  if (!raw?.trim()) {
    return "Elevate Health Solutions"
  }
  const trimmed = raw.trim()
  const nameMatch = trimmed.match(/^(.*?)\s*<[^>]+>$/)
  if (nameMatch?.[1]?.trim()) {
    return nameMatch[1].trim()
  }
  if (email && trimmed.toLowerCase() === email) {
    return "Elevate Health Solutions"
  }
  return trimmed.includes("<") ? "Elevate Health Solutions" : trimmed
}

/**
 * Runtime transactional email configuration.
 * Never logs secrets. Callers must treat missing/invalid production From as fail-closed.
 */
export function getTransactionalEmailConfig(): TransactionalEmailRuntimeConfig {
  const isProduction = process.env.NODE_ENV === "production"
  const fromRaw = process.env.TRANSACTIONAL_EMAIL_FROM
  const fromAddress = parseFromAddress(fromRaw)
  const fromName = parseFromDisplay(fromRaw, fromAddress)
  const replyToRaw = process.env.TRANSACTIONAL_EMAIL_REPLY_TO?.trim()
  const replyTo =
    replyToRaw && emailAddressSchema.safeParse(replyToRaw).success
      ? replyToRaw.toLowerCase()
      : null

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const testRecipientAllowlist = parseAllowlist(
    process.env.EMAIL_TEST_RECIPIENT_ALLOWLIST
  )
  const requireAllowlist = parseBoolean(
    process.env.EMAIL_REQUIRE_ALLOWLIST,
    !isProduction
  )

  // Default: delivery enabled when API key present; production still fail-closed on From.
  const deliveryEnabled = parseBoolean(
    process.env.EMAIL_DELIVERY_ENABLED,
    Boolean(process.env.RESEND_API_KEY)
  )

  const batchSize = Math.min(
    50,
    Math.max(1, Number.parseInt(process.env.EMAIL_OUTBOX_BATCH_SIZE ?? "10", 10) || 10)
  )
  const maxAttempts = Math.min(
    20,
    Math.max(1, Number.parseInt(process.env.EMAIL_OUTBOX_MAX_ATTEMPTS ?? "8", 10) || 8)
  )

  return {
    apiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    fromAddress,
    fromName,
    replyTo,
    deliveryEnabled,
    testRecipientAllowlist,
    appUrl,
    isProduction,
    batchSize,
    maxAttempts,
    requireAllowlist,
  }
}

export type SenderValidationResult =
  | { ok: true; fromHeader: string; replyTo: string | null }
  | { ok: false; reason: string; permanent: boolean }

/**
 * Production refuses unverified/missing From. Never invents a customer-facing domain.
 * Local/test may use onboarding@resend.dev only when explicitly configured via TRANSACTIONAL_EMAIL_FROM
 * or when EMAIL_ALLOW_RESEND_DEV_FROM=true (non-production only).
 */
export function validateTransactionalSender(
  config: TransactionalEmailRuntimeConfig = getTransactionalEmailConfig()
): SenderValidationResult {
  let fromAddress = config.fromAddress

  if (!fromAddress) {
    const allowDevFrom =
      !config.isProduction &&
      parseBoolean(process.env.EMAIL_ALLOW_RESEND_DEV_FROM, false)
    if (allowDevFrom) {
      fromAddress = "onboarding@resend.dev"
    } else {
      return {
        ok: false,
        reason: "TRANSACTIONAL_EMAIL_FROM is missing or invalid.",
        permanent: config.isProduction,
      }
    }
  }

  if (config.isProduction && fromAddress.endsWith("@resend.dev")) {
    return {
      ok: false,
      reason: "Production must not send from resend.dev. Use a verified Elevate domain.",
      permanent: true,
    }
  }

  if (!config.apiKeyPresent) {
    return {
      ok: false,
      reason: "RESEND_API_KEY is not configured.",
      permanent: false,
    }
  }

  if (!config.deliveryEnabled) {
    return {
      ok: false,
      reason: "EMAIL_DELIVERY_ENABLED is false.",
      permanent: false,
    }
  }

  if (!config.appUrl) {
    return {
      ok: false,
      reason: "NEXT_PUBLIC_APP_URL is required for email CTAs.",
      permanent: config.isProduction,
    }
  }

  return {
    ok: true,
    fromHeader: `${config.fromName} <${fromAddress}>`,
    replyTo: config.replyTo,
  }
}

export function isRecipientAllowed(
  recipientEmail: string,
  config: TransactionalEmailRuntimeConfig = getTransactionalEmailConfig()
): { allowed: boolean; reason?: string } {
  const normalized = recipientEmail.trim().toLowerCase()
  if (!emailAddressSchema.safeParse(normalized).success) {
    return { allowed: false, reason: "invalid_recipient" }
  }

  // Never silently redirect production customer mail to a developer address.
  if (config.requireAllowlist) {
    if (config.testRecipientAllowlist.length === 0) {
      return { allowed: false, reason: "allowlist_empty" }
    }
    if (!config.testRecipientAllowlist.includes(normalized)) {
      return { allowed: false, reason: "not_allowlisted" }
    }
  }

  return { allowed: true }
}
