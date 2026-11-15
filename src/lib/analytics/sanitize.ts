import type { AnalyticsEvent } from "./types"

const ANALYTICS_PII_KEYS = [
  "email",
  "e-mail",
  "phone",
  "telephone",
  "mobile",
  "message",
  "name",
  "full_name",
  "fullName",
  "first_name",
  "last_name",
  "firstName",
  "lastName",
  "certificate_name",
  "certificateName",
  "address",
  "health",
  "health_info",
  "healthInfo",
  "password",
  "token",
  "secret",
  "user_id",
  "userId",
  "ip",
  "user_agent",
  "userAgent",
] as const

const PII_KEY_SET = new Set<string>(
  ANALYTICS_PII_KEYS.map((key) => key.toLowerCase())
)

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function containsPiiKey(key: string): boolean {
  return PII_KEY_SET.has(key.toLowerCase())
}

function sanitizeUnknown(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return undefined
  }

  if (typeof value === "string") {
    if (looksLikeEmail(value)) {
      return undefined
    }
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeUnknown(entry, depth + 1))
      .filter((entry) => entry !== undefined)
  }

  if (!isPlainObject(value)) {
    return value
  }

  const next: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (containsPiiKey(key)) {
      continue
    }
    const sanitized = sanitizeUnknown(entry, depth + 1)
    if (sanitized !== undefined) {
      next[key] = sanitized
    }
  }
  return next
}

export function sanitizeAnalyticsEvent(event: AnalyticsEvent): AnalyticsEvent {
  const sanitized = sanitizeUnknown(event)
  if (!isPlainObject(sanitized) || typeof sanitized.event !== "string") {
    return { event: "signup" }
  }
  return sanitized as AnalyticsEvent
}

export function analyticsEventHasPii(event: AnalyticsEvent): boolean {
  function walk(value: unknown, depth = 0): boolean {
    if (depth > 6) {
      return false
    }
    if (typeof value === "string") {
      return looksLikeEmail(value)
    }
    if (Array.isArray(value)) {
      return value.some((entry) => walk(entry, depth + 1))
    }
    if (!isPlainObject(value)) {
      return false
    }
    return Object.entries(value).some(([key, entry]) => {
      if (containsPiiKey(key)) {
        return true
      }
      return walk(entry, depth + 1)
    })
  }

  return walk(event)
}
