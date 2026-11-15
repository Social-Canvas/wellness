import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  consumeRateLimit,
  createMemoryRateLimitStore,
  FIFTEEN_MINUTES_MS,
  hashRateLimitKey,
  LEAD_RATE_LIMIT_POLICY,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  SIGNUP_RATE_LIMIT_POLICY,
} from "./durable-rate-limit.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

test("first lead submission is not blocked", async () => {
  const store = createMemoryRateLimitStore()
  const decision = await consumeRateLimit({
    store,
    policy: LEAD_RATE_LIMIT_POLICY,
    email: "first@example.com",
    ip: "203.0.113.10",
  })
  assert.equal(decision.allowed, true)
  assert.equal(store.rows.length, 2)
})

test("blocks the 4th lead from the same email within 24 hours", async () => {
  const store = createMemoryRateLimitStore()
  const email = "repeat@example.com"
  const start = Date.parse("2026-10-01T00:00:00.000Z")

  for (let i = 0; i < 3; i += 1) {
    const decision = await consumeRateLimit({
      store,
      policy: LEAD_RATE_LIMIT_POLICY,
      email,
      ip: `203.0.113.${20 + i}`,
      now: start + i * ONE_HOUR_MS,
    })
    assert.equal(decision.allowed, true)
  }

  const blocked = await consumeRateLimit({
    store,
    policy: LEAD_RATE_LIMIT_POLICY,
    email,
    ip: "203.0.113.99",
    now: start + 12 * ONE_HOUR_MS,
  })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.hit?.keyType, "email")
  assert.equal(blocked.hit?.windowMs, ONE_DAY_MS)
  assert.equal(blocked.hit?.max, 3)
})

test("email 24h cap is independent of IP so drip repeats are stopped", async () => {
  const store = createMemoryRateLimitStore()
  const email = "drip@example.com"
  const start = Date.parse("2026-09-01T08:00:00.000Z")

  for (let day = 0; day < 3; day += 1) {
    const decision = await consumeRateLimit({
      store,
      policy: LEAD_RATE_LIMIT_POLICY,
      email,
      ip: `198.51.100.${day + 1}`,
      now: start + day * 8 * ONE_HOUR_MS,
    })
    assert.equal(decision.allowed, true)
  }

  const fourth = await consumeRateLimit({
    store,
    policy: LEAD_RATE_LIMIT_POLICY,
    email,
    ip: "198.51.100.9",
    now: start + 20 * ONE_HOUR_MS,
  })
  assert.equal(fourth.allowed, false)
})

test("blocks the 6th lead from the same IP within an hour", async () => {
  const store = createMemoryRateLimitStore()
  const ip = "192.0.2.40"
  const start = Date.parse("2026-10-02T12:00:00.000Z")

  for (let i = 0; i < 5; i += 1) {
    const decision = await consumeRateLimit({
      store,
      policy: LEAD_RATE_LIMIT_POLICY,
      email: `user${i}@example.com`,
      ip,
      now: start + i * 60_000,
    })
    assert.equal(decision.allowed, true)
  }

  const blocked = await consumeRateLimit({
    store,
    policy: LEAD_RATE_LIMIT_POLICY,
    email: "user5@example.com",
    ip,
    now: start + 10 * 60_000,
  })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.hit?.keyType, "ip")
  assert.equal(blocked.hit?.max, 5)
})

test("IP hour cap still blocks when 15-minute burst windows have elapsed", async () => {
  const store = createMemoryRateLimitStore()
  const ip = "192.0.2.88"
  const start = Date.parse("2026-10-04T09:00:00.000Z")
  const offsetsMin = [0, 16, 32, 45, 50]

  for (const [index, offset] of offsetsMin.entries()) {
    const decision = await consumeRateLimit({
      store,
      policy: LEAD_RATE_LIMIT_POLICY,
      email: `spread${index}@example.com`,
      ip,
      now: start + offset * 60 * 1000,
    })
    assert.equal(decision.allowed, true)
  }

  const blocked = await consumeRateLimit({
    store,
    policy: LEAD_RATE_LIMIT_POLICY,
    email: "spread5@example.com",
    ip,
    now: start + 55 * 60 * 1000,
  })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.hit?.keyType, "ip")
  assert.equal(blocked.hit?.windowMs, ONE_HOUR_MS)
})

test("does not delete stored rate limit rows when blocking", async () => {
  const store = createMemoryRateLimitStore()
  const email = "keep@example.com"
  const ip = "203.0.113.50"
  const start = Date.parse("2026-10-03T00:00:00.000Z")

  for (let i = 0; i < 3; i += 1) {
    await consumeRateLimit({
      store,
      policy: LEAD_RATE_LIMIT_POLICY,
      email,
      ip,
      now: start + i * 1000,
    })
  }

  const before = store.rows.slice()
  assert.equal(before.length, 6)

  const blocked = await consumeRateLimit({
    store,
    policy: LEAD_RATE_LIMIT_POLICY,
    email,
    ip,
    now: start + FIFTEEN_MINUTES_MS / 2,
  })
  assert.equal(blocked.allowed, false)
  assert.equal(store.rows.length, before.length)
  assert.deepEqual(store.rows, before)
  assert.equal(
    Object.prototype.hasOwnProperty.call(store, "delete"),
    false
  )
})

test("signup uses a separate scope from lead so enquiry spam does not block signup", async () => {
  const store = createMemoryRateLimitStore()
  const email = "shared@example.com"
  const ip = "203.0.113.70"

  for (let i = 0; i < 3; i += 1) {
    const lead = await consumeRateLimit({
      store,
      policy: LEAD_RATE_LIMIT_POLICY,
      email,
      ip,
    })
    assert.equal(lead.allowed, true)
  }

  const signup = await consumeRateLimit({
    store,
    policy: SIGNUP_RATE_LIMIT_POLICY,
    email,
    ip,
  })
  assert.equal(signup.allowed, true)
})

test("rate limit keys are hashed and never store raw email", async () => {
  const email = "person@example.com"
  const hash = hashRateLimitKey("email", email)
  assert.equal(hash.includes("@"), false)
  assert.equal(hash.includes("person"), false)
  assert.equal(hash.length, 64)
  assert.equal(hashRateLimitKey("email", "  Person@Example.com "), hash)
})

test("migration is append-only, RLS service-role, and never deletes", () => {
  const migration = readSrc(
    "supabase/migrations/20261025190000_public_form_rate_limits.sql"
  )
  assert.match(migration, /create table if not exists public\.public_form_rate_limits/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /grant select, insert on table public\.public_form_rate_limits to service_role/)
  assert.doesNotMatch(migration, /grant .*delete/i)
  assert.doesNotMatch(migration, /delete from public\.public_form_rate_limits/i)
  assert.match(migration, /to anon, authenticated/)
  assert.match(migration, /using \(false\)/)
})
