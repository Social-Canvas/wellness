/**
 * Pure helpers for organization sponsorship access codes.
 * Safe for unit tests — no DB / Node crypto server modules required for hashing
 * when Web Crypto is available; Node `crypto` used in Node test/runtime.
 */

import { createHash, randomBytes } from "node:crypto"

export const ORGANIZATION_ACCESS_CODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" as const

export const SPONSORED_CONTENT_PLAN_SLUG = "plan-3" as const

export const ORGANIZATION_ACCESS_CODE_DISPLAY_PREFIX = "ELEVATE" as const

export type OrganizationAccessRedemptionErrorCode =
  | "invalid_code"
  | "code_expired"
  | "code_revoked"
  | "organization_inactive"
  | "seat_limit_reached"
  | "email_domain_not_approved"
  | "already_sponsored"
  | "rate_limited"
  | "unauthenticated"
  | "invalid_user"

export const ORGANIZATION_ACCESS_REDEMPTION_ERROR_MESSAGES: Record<
  OrganizationAccessRedemptionErrorCode,
  string
> = {
  invalid_code: "Invalid code",
  code_expired: "Code expired",
  code_revoked: "Code revoked",
  organization_inactive: "Organization inactive",
  seat_limit_reached: "Seat limit reached",
  email_domain_not_approved: "Email domain not approved",
  already_sponsored: "User already has this sponsored access",
  rate_limited: "Too many failed attempts. Please try again later.",
  unauthenticated: "Sign in to activate sponsored access.",
  invalid_user: "Unable to redeem this code for your account.",
}

/** Occupied seats: active + suspended (reserved) + pending invitations. */
export function isOccupiedOrganizationMemberStatus(status: string): boolean {
  return status === "active" || status === "suspended" || status === "invited"
}

export function availableOrganizationSeats(input: {
  seatLimit: number
  occupiedSeats: number
}): number | null {
  if (input.seatLimit <= 0) {
    return null
  }
  return Math.max(0, input.seatLimit - input.occupiedSeats)
}

export function normalizeOrganizationAccessCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

export function formatOrganizationAccessCode(rawNormalized: string): string {
  const compact = normalizeOrganizationAccessCode(rawNormalized)
  if (compact.length < 12) {
    return compact
  }
  // ELEVATE + 8 random chars → ELEVATE-XXXX-XXXX
  const body = compact.startsWith("ELEVATE") ? compact.slice(7) : compact
  const chunk1 = body.slice(0, 4)
  const chunk2 = body.slice(4, 8)
  return `ELEVATE-${chunk1}-${chunk2}`
}

export function organizationAccessCodePrefix(displayCode: string): string {
  const formatted = formatOrganizationAccessCode(displayCode)
  const parts = formatted.split("-")
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`
  }
  return formatted.slice(0, Math.min(11, formatted.length))
}

function randomAlphabetChars(length: number): string {
  const alphabet = ORGANIZATION_ACCESS_CODE_ALPHABET
  const bytes = randomBytes(length)
  let out = ""
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length]
  }
  return out
}

/**
 * Cryptographically secure display code. Not derived from organization name.
 */
export function generateOrganizationAccessCode(): string {
  const body = randomAlphabetChars(8)
  return `ELEVATE-${body.slice(0, 4)}-${body.slice(4, 8)}`
}

export function hashOrganizationAccessCode(code: string): string {
  const normalized = normalizeOrganizationAccessCode(code)
  return createHash("sha256").update(normalized, "utf8").digest("hex")
}

export function mapRedeemRpcError(
  error: string | null | undefined
): OrganizationAccessRedemptionErrorCode {
  switch (error) {
    case "invalid_code":
    case "code_expired":
    case "code_revoked":
    case "organization_inactive":
    case "seat_limit_reached":
    case "email_domain_not_approved":
    case "already_sponsored":
    case "invalid_user":
      return error
    default:
      return "invalid_code"
  }
}

export function redemptionFailureMessage(
  code: OrganizationAccessRedemptionErrorCode
): string {
  return ORGANIZATION_ACCESS_REDEMPTION_ERROR_MESSAGES[code]
}

/** Public partnership benefits — Platinum-aligned without duplicating DB keys. */
export function nonprofitPartnershipBenefitLabels(input: {
  platinumFeatures: readonly string[]
}): readonly string[] {
  void input.platinumFeatures
  return [
    "Elevate course and recorded-session library",
    "Access to live virtual classes",
    "Platinum-equivalent membership privileges",
    "Included in-person experience according to the current Platinum configuration",
    "Individual participant accounts",
    "Organization administrator dashboard",
    "Seat and member management",
    "Integration Journal",
  ]
}
