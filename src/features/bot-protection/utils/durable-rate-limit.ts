/**
 * Durable public-form rate limiting (email AND IP).
 *
 * Chosen limits — documented so operators know what the 44-bot retreat
 * campaign would have hit:
 *
 * Lead / retreat / enquiry (`scope: lead`)
 *   email: 3 / 15 min (burst) AND 3 / 24 h (drip cap)
 *   ip:    5 / 15 min (burst) AND 5 / 1 h
 *
 * Signup (`scope: signup`)
 *   email: 3 / 15 min AND 5 / 24 h
 *   ip:    5 / 15 min AND 10 / 1 h
 *
 * Forgot-password / resend-verification (`scope: auth_email`)
 *   same numbers as signup (separate counter so signup retries do not
 *   lock someone out of password reset).
 *
 * Either key hitting any rule blocks. User-facing copy is generic; logs
 * use hashes only. A 15-minute window alone would NOT have stopped the
 * 6–7 repeats from one email over days; the 24 h email cap would have
 * allowed 3 of those and blocked the rest. Unique one-off emails (the
 * remaining ~26 of 44) still need Turnstile/honeypot.
 *
 * Counts persist in `public.public_form_rate_limits` (append-only).
 * In-memory maps are a same-instance burst fallback only — not sufficient
 * on Vercel serverless by themselves.
 */

import { createHash } from "node:crypto"

export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
export const ONE_HOUR_MS = 60 * 60 * 1000
export const ONE_DAY_MS = 24 * 60 * 60 * 1000

export type RateLimitKeyType = "email" | "ip"
export type RateLimitScope = "lead" | "signup" | "auth_email"

export type RateLimitRule = {
  keyType: RateLimitKeyType
  windowMs: number
  max: number
}

export type RateLimitPolicy = {
  scope: RateLimitScope
  rules: readonly RateLimitRule[]
}

export type RateLimitEventRow = {
  keyType: RateLimitKeyType
  keyHash: string
  createdAtMs: number
}

export type RateLimitHit = RateLimitRule & {
  count: number
}

export type RateLimitDecision = {
  allowed: boolean
  emailHash: string
  ipHash: string
  hit?: RateLimitHit
}

export type RateLimitInsertRow = {
  scope: RateLimitScope
  keyType: RateLimitKeyType
  keyHash: string
  createdAtIso: string
}

export type RateLimitStore = {
  listSince(input: {
    scope: RateLimitScope
    keyHashes: string[]
    sinceIso: string
  }): Promise<RateLimitEventRow[]>
  insert(rows: RateLimitInsertRow[]): Promise<void>
}

export const LEAD_RATE_LIMIT_POLICY: RateLimitPolicy = {
  scope: "lead",
  rules: [
    { keyType: "email", windowMs: FIFTEEN_MINUTES_MS, max: 3 },
    { keyType: "email", windowMs: ONE_DAY_MS, max: 3 },
    { keyType: "ip", windowMs: FIFTEEN_MINUTES_MS, max: 5 },
    { keyType: "ip", windowMs: ONE_HOUR_MS, max: 5 },
  ],
}

export const SIGNUP_RATE_LIMIT_POLICY: RateLimitPolicy = {
  scope: "signup",
  rules: [
    { keyType: "email", windowMs: FIFTEEN_MINUTES_MS, max: 3 },
    { keyType: "email", windowMs: ONE_DAY_MS, max: 5 },
    { keyType: "ip", windowMs: FIFTEEN_MINUTES_MS, max: 5 },
    { keyType: "ip", windowMs: ONE_HOUR_MS, max: 10 },
  ],
}

export const AUTH_EMAIL_RATE_LIMIT_POLICY: RateLimitPolicy = {
  scope: "auth_email",
  rules: SIGNUP_RATE_LIMIT_POLICY.rules,
}

export const RATE_LIMIT_USER_ERROR =
  "Too many requests. Please try again later."

export const LEAD_RATE_LIMIT_USER_ERROR =
  "Too many enquiries were submitted recently. Please try again later."

export function normalizeRateLimitEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeRateLimitIp(ip: string): string {
  return ip.trim() || "unknown"
}

export function hashRateLimitKey(
  keyType: RateLimitKeyType,
  value: string
): string {
  const normalized =
    keyType === "email" ? normalizeRateLimitEmail(value) : normalizeRateLimitIp(value)
  return createHash("sha256")
    .update(`rate-limit:${keyType}:${normalized}`, "utf8")
    .digest("hex")
}

export function redactRateLimitHash(hash: string): string {
  return hash.slice(0, 12)
}

export function longestWindowMs(policy: RateLimitPolicy): number {
  return policy.rules.reduce((max, rule) => Math.max(max, rule.windowMs), 0)
}

export function evaluateRateLimit(
  events: RateLimitEventRow[],
  policy: RateLimitPolicy,
  now: number
): { limited: boolean; hit?: RateLimitHit } {
  for (const rule of policy.rules) {
    const count = events.filter(
      (event) =>
        event.keyType === rule.keyType && now - event.createdAtMs <= rule.windowMs
    ).length
    if (count >= rule.max) {
      return { limited: true, hit: { ...rule, count } }
    }
  }
  return { limited: false }
}

export async function consumeRateLimit(input: {
  store: RateLimitStore
  policy: RateLimitPolicy
  email: string
  ip: string
  now?: number
}): Promise<RateLimitDecision> {
  const now = input.now ?? Date.now()
  const emailHash = hashRateLimitKey("email", input.email)
  const ipHash = hashRateLimitKey("ip", input.ip)
  const sinceIso = new Date(now - longestWindowMs(input.policy)).toISOString()

  const events = await input.store.listSince({
    scope: input.policy.scope,
    keyHashes: [emailHash, ipHash],
    sinceIso,
  })

  const evaluation = evaluateRateLimit(events, input.policy, now)
  if (evaluation.limited) {
    return {
      allowed: false,
      emailHash,
      ipHash,
      hit: evaluation.hit,
    }
  }

  await input.store.insert([
    {
      scope: input.policy.scope,
      keyType: "email",
      keyHash: emailHash,
      createdAtIso: new Date(now).toISOString(),
    },
    {
      scope: input.policy.scope,
      keyType: "ip",
      keyHash: ipHash,
      createdAtIso: new Date(now).toISOString(),
    },
  ])

  return { allowed: true, emailHash, ipHash }
}

type MemoryStoreRow = RateLimitInsertRow

export type MemoryRateLimitStore = RateLimitStore & {
  rows: MemoryStoreRow[]
}

export function createMemoryRateLimitStore(
  seed: MemoryStoreRow[] = []
): MemoryRateLimitStore {
  const rows: MemoryStoreRow[] = [...seed]

  return {
    rows,
    async listSince(input) {
      const sinceMs = Date.parse(input.sinceIso)
      const hashes = new Set(input.keyHashes)
      return rows
        .filter(
          (row) =>
            row.scope === input.scope &&
            hashes.has(row.keyHash) &&
            Date.parse(row.createdAtIso) >= sinceMs
        )
        .map((row) => ({
          keyType: row.keyType,
          keyHash: row.keyHash,
          createdAtMs: Date.parse(row.createdAtIso),
        }))
    },
    async insert(newRows) {
      rows.push(...newRows)
    },
  }
}

