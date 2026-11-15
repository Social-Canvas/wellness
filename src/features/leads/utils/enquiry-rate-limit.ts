/**
 * Same-instance enquiry burst fallback (email OR IP, 15-minute windows).
 * Durable hashed email+IP counting lives in
 * `src/features/bot-protection/utils/durable-rate-limit.ts`.
 * Keep these burst numbers in sync with LEAD_RATE_LIMIT_POLICY.
 */

const WINDOW_MS = 15 * 60 * 1000
const MAX_EMAIL_BURST = 3
const MAX_IP_BURST = 5

type WindowEntry = {
  count: number
  windowStartedAt: number
}

const memoryWindows = new Map<string, WindowEntry>()

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizeIp(ip: string): string {
  return ip.trim() || "unknown"
}

function burstKey(kind: "email" | "ip", value: string): string {
  return `lead:${kind}:${kind === "email" ? normalizeEmail(value) : normalizeIp(value)}`
}

function isKeyLimited(key: string, max: number, now: number): boolean {
  const entry = memoryWindows.get(key)
  if (!entry) {
    return false
  }
  if (now - entry.windowStartedAt > WINDOW_MS) {
    memoryWindows.delete(key)
    return false
  }
  return entry.count >= max
}

function recordKey(key: string, now: number): void {
  const entry = memoryWindows.get(key)
  if (!entry || now - entry.windowStartedAt > WINDOW_MS) {
    memoryWindows.set(key, { count: 1, windowStartedAt: now })
    return
  }
  entry.count += 1
}

export function enquiryRateLimitKey(email: string, ip: string): string {
  return `enquiry:${normalizeEmail(email)}:${normalizeIp(ip)}`
}

export function isEnquiryRateLimited(
  email: string,
  ip: string,
  now = Date.now()
): boolean {
  return (
    isKeyLimited(burstKey("email", email), MAX_EMAIL_BURST, now) ||
    isKeyLimited(burstKey("ip", ip), MAX_IP_BURST, now)
  )
}

export function recordEnquiryAttempt(
  email: string,
  ip: string,
  now = Date.now()
): void {
  recordKey(burstKey("email", email), now)
  recordKey(burstKey("ip", ip), now)
}

/** Test helper — reset in-memory windows between cases. */
export function resetEnquiryRateLimitStateForTests(): void {
  memoryWindows.clear()
}

export const ENQUIRY_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxSubmissions: MAX_EMAIL_BURST,
  maxEmailPerDay: 3,
  maxIpBurst: MAX_IP_BURST,
  ipHourWindowMs: 60 * 60 * 1000,
  emailDayWindowMs: 24 * 60 * 60 * 1000,
} as const
