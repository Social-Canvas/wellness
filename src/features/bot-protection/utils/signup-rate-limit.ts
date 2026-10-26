/**
 * Same-instance signup burst fallback (email OR IP, 15-minute windows).
 * Durable hashed email+IP counting lives in durable-rate-limit.ts.
 * Keep these burst numbers in sync with SIGNUP_RATE_LIMIT_POLICY.
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
  return `signup:${kind}:${kind === "email" ? normalizeEmail(value) : normalizeIp(value)}`
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

export function signupRateLimitKey(email: string, ip: string): string {
  return `signup:${normalizeEmail(email)}:${normalizeIp(ip)}`
}

export function isSignupRateLimited(
  email: string,
  ip: string,
  now = Date.now()
): boolean {
  return (
    isKeyLimited(burstKey("email", email), MAX_EMAIL_BURST, now) ||
    isKeyLimited(burstKey("ip", ip), MAX_IP_BURST, now)
  )
}

export function recordSignupAttempt(email: string, ip: string, now = Date.now()): void {
  recordKey(burstKey("email", email), now)
  recordKey(burstKey("ip", ip), now)
}

export function resetSignupRateLimitStateForTests(): void {
  memoryWindows.clear()
}

export const SIGNUP_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxAttempts: MAX_EMAIL_BURST,
  maxEmailPerDay: 5,
  maxIpBurst: MAX_IP_BURST,
  ipHourWindowMs: 60 * 60 * 1000,
  emailDayWindowMs: 24 * 60 * 60 * 1000,
} as const
