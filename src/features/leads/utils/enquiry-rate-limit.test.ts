import assert from "node:assert/strict"
import { test } from "node:test"

import {
  ENQUIRY_RATE_LIMIT,
  isEnquiryRateLimited,
  recordEnquiryAttempt,
  resetEnquiryRateLimitStateForTests,
} from "./enquiry-rate-limit.ts"

test("enquiry rate limit allows submissions under the cap", () => {
  resetEnquiryRateLimitStateForTests()
  const email = "person@example.com"
  const ip = "203.0.113.10"

  for (let i = 0; i < ENQUIRY_RATE_LIMIT.maxSubmissions - 1; i += 1) {
    assert.equal(isEnquiryRateLimited(email, ip), false)
    recordEnquiryAttempt(email, ip)
  }
  assert.equal(isEnquiryRateLimited(email, ip), false)
  recordEnquiryAttempt(email, ip)
  assert.equal(isEnquiryRateLimited(email, ip), true)
})

test("enquiry rate limit is scoped by email and ip", () => {
  resetEnquiryRateLimitStateForTests()
  const email = "person@example.com"

  for (let i = 0; i < ENQUIRY_RATE_LIMIT.maxSubmissions; i += 1) {
    recordEnquiryAttempt(email, "203.0.113.1")
  }

  assert.equal(isEnquiryRateLimited(email, "203.0.113.1"), true)
  assert.equal(isEnquiryRateLimited(email, "203.0.113.2"), false)
  assert.equal(isEnquiryRateLimited("other@example.com", "203.0.113.1"), false)
})

test("enquiry rate limit window resets after expiry", () => {
  resetEnquiryRateLimitStateForTests()
  const email = "person@example.com"
  const ip = "203.0.113.9"
  const start = 1_700_000_000_000

  for (let i = 0; i < ENQUIRY_RATE_LIMIT.maxSubmissions; i += 1) {
    recordEnquiryAttempt(email, ip, start)
  }
  assert.equal(isEnquiryRateLimited(email, ip, start), true)
  assert.equal(
    isEnquiryRateLimited(email, ip, start + ENQUIRY_RATE_LIMIT.windowMs + 1),
    false
  )
})
