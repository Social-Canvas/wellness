import { z } from "zod"

/**
 * Canonical public app origin for Auth redirects and absolute links.
 * Never prefers VERCEL_URL when NEXT_PUBLIC_APP_URL is set.
 * Strips trailing slashes so `/auth/callback` is not doubled.
 */
export function normalizeAppOrigin(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  const candidate = trimmed
  // Production must not emit http:// for Vercel hosts (mixed-content / allowlist misses).
  try {
    const parsed = new URL(candidate.includes("://") ? candidate : `https://${candidate}`)
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname.endsWith(".vercel.app") ||
        parsed.hostname === "elevate-healthsolutions.com" ||
        parsed.hostname.endsWith(".elevate-healthsolutions.com") ||
        // Legacy unhyphenated hostname (pre-launch typo) — still force HTTPS.
        parsed.hostname === "elevatehealthsolutions.com" ||
        parsed.hostname.endsWith(".elevatehealthsolutions.com"))
    ) {
      parsed.protocol = "https:"
    }
    const normalized = `${parsed.protocol}//${parsed.host}`
    return normalized.replace(/\/$/, "")
  } catch {
    return null
  }
}

export function resolveCanonicalAppUrl(input: {
  appUrl?: string | null
  siteUrl?: string | null
  vercelUrl?: string | null
  vercelEnv?: string | null
  nodeEnv?: string | null
}): string {
  const fromApp = normalizeAppOrigin(input.appUrl)
  if (fromApp) {
    return fromApp
  }

  const fromSite = normalizeAppOrigin(input.siteUrl)
  if (fromSite) {
    return fromSite
  }

  // Preview / local fallbacks only when NEXT_PUBLIC_APP_URL is unset.
  if (input.vercelEnv === "preview" && input.vercelUrl) {
    const fromVercel = normalizeAppOrigin(
      input.vercelUrl.includes("://")
        ? input.vercelUrl
        : `https://${input.vercelUrl}`
    )
    if (fromVercel) {
      return fromVercel
    }
  }

  if (input.nodeEnv !== "production") {
    return "http://localhost:3000"
  }

  throw new Error("NEXT_PUBLIC_APP_URL is required in production.")
}

export function getCanonicalAppUrl(): string {
  return resolveCanonicalAppUrl({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  })
}

export function buildAuthCallbackUrl(
  nextPath: string,
  appUrl: string = getCanonicalAppUrl()
): string {
  const origin = normalizeAppOrigin(appUrl) ?? getCanonicalAppUrl()
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`
}

const authErrorCodeSchema = z.enum([
  "auth_callback_missing_code",
  "auth_callback_failed",
  "auth_callback_expired",
  "auth_callback_used",
  "auth_callback_denied",
  "auth_callback_invalid",
])

export type AuthCallbackErrorCode = z.infer<typeof authErrorCodeSchema>

export function mapAuthCallbackProviderError(input: {
  error?: string | null
  errorCode?: string | null
  errorDescription?: string | null
  exchangeMessage?: string | null
}): AuthCallbackErrorCode {
  const haystack = [
    input.error,
    input.errorCode,
    input.errorDescription,
    input.exchangeMessage,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (!haystack) {
    return "auth_callback_failed"
  }

  if (
    haystack.includes("otp_expired") ||
    haystack.includes("expired") ||
    haystack.includes("flow_state_expired")
  ) {
    return "auth_callback_expired"
  }

  if (
    haystack.includes("already been used") ||
    haystack.includes("flow_state_not_found") ||
    haystack.includes("reuse")
  ) {
    return "auth_callback_used"
  }

  if (
    haystack.includes("access_denied") ||
    haystack.includes("unauthorized") ||
    haystack.includes("denied")
  ) {
    return "auth_callback_denied"
  }

  if (
    haystack.includes("invalid") ||
    haystack.includes("bad_jwt") ||
    haystack.includes("token")
  ) {
    return "auth_callback_invalid"
  }

  return "auth_callback_failed"
}

export function authCallbackErrorMessage(code: AuthCallbackErrorCode): string {
  switch (code) {
    case "auth_callback_expired":
      return "This confirmation link has expired. Request a new verification email to continue."
    case "auth_callback_used":
      return "This confirmation link was already used. Sign in, or request a new verification email if you still need access."
    case "auth_callback_denied":
      return "We couldn't confirm this email link. Request a new verification email or return to sign in."
    case "auth_callback_missing_code":
    case "auth_callback_invalid":
      return "We couldn't confirm this email link. It may be incomplete or invalid."
    case "auth_callback_failed":
    default:
      return "We couldn't confirm this email link. Please try again or request a new verification email."
  }
}

export function isAuthCallbackErrorCode(
  value: string | null | undefined
): value is AuthCallbackErrorCode {
  return authErrorCodeSchema.safeParse(value).success
}

/**
 * Prefer the live request origin when configured APP_URL is localhost but the
 * request is on a real host (misconfigured Vercel Production env).
 */
export function resolveAuthRequestOrigin(input: {
  requestOrigin: string
  configuredAppUrl?: string | null
}): string {
  const configured = normalizeAppOrigin(input.configuredAppUrl)
  if (!configured) {
    return input.requestOrigin
  }

  if (
    /localhost|127\.0\.0\.1/i.test(configured) &&
    !/localhost|127\.0\.0\.1/i.test(input.requestOrigin)
  ) {
    return input.requestOrigin
  }

  return configured
}
