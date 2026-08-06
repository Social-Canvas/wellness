/**
 * In-process + DB-backed failed redemption rate limiting.
 * Never stores or logs full access codes.
 */

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 8

type WindowEntry = {
  failures: number
  windowStartedAt: number
}

const memoryWindows = new Map<string, WindowEntry>()

export function redemptionRateLimitKey(profileId: string): string {
  return `org_access_redeem:${profileId}`
}

export function isRedemptionRateLimited(
  profileId: string,
  now = Date.now()
): boolean {
  const key = redemptionRateLimitKey(profileId)
  const entry = memoryWindows.get(key)
  if (!entry) {
    return false
  }
  if (now - entry.windowStartedAt > WINDOW_MS) {
    memoryWindows.delete(key)
    return false
  }
  return entry.failures >= MAX_FAILURES
}

export function recordRedemptionFailure(
  profileId: string,
  now = Date.now()
): void {
  const key = redemptionRateLimitKey(profileId)
  const entry = memoryWindows.get(key)
  if (!entry || now - entry.windowStartedAt > WINDOW_MS) {
    memoryWindows.set(key, { failures: 1, windowStartedAt: now })
    return
  }
  entry.failures += 1
}

export function clearRedemptionFailures(profileId: string): void {
  memoryWindows.delete(redemptionRateLimitKey(profileId))
}

/** Test helper — reset in-memory windows between cases. */
export function resetRedemptionRateLimitStateForTests(): void {
  memoryWindows.clear()
}

export const REDEMPTION_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxFailures: MAX_FAILURES,
} as const
