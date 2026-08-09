/**
 * In-memory enquiry submission rate limiting (email + IP window).
 * Soft protection for spam bursts; not a substitute for edge WAF.
 */

const WINDOW_MS = 15 * 60 * 1000
const MAX_SUBMISSIONS = 5

type WindowEntry = {
  count: number
  windowStartedAt: number
}

const memoryWindows = new Map<string, WindowEntry>()

export function enquiryRateLimitKey(email: string, ip: string): string {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedIp = ip.trim() || "unknown"
  return `enquiry:${normalizedEmail}:${normalizedIp}`
}

export function isEnquiryRateLimited(
  email: string,
  ip: string,
  now = Date.now()
): boolean {
  const key = enquiryRateLimitKey(email, ip)
  const entry = memoryWindows.get(key)
  if (!entry) {
    return false
  }
  if (now - entry.windowStartedAt > WINDOW_MS) {
    memoryWindows.delete(key)
    return false
  }
  return entry.count >= MAX_SUBMISSIONS
}

export function recordEnquiryAttempt(
  email: string,
  ip: string,
  now = Date.now()
): void {
  const key = enquiryRateLimitKey(email, ip)
  const entry = memoryWindows.get(key)
  if (!entry || now - entry.windowStartedAt > WINDOW_MS) {
    memoryWindows.set(key, { count: 1, windowStartedAt: now })
    return
  }
  entry.count += 1
}

/** Test helper — reset in-memory windows between cases. */
export function resetEnquiryRateLimitStateForTests(): void {
  memoryWindows.clear()
}

export const ENQUIRY_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxSubmissions: MAX_SUBMISSIONS,
} as const
