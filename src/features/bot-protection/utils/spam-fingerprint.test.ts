import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { composeRetreatEnquiryMessage } from "../../leads/utils/retreat-enquiry.ts"
import {
  evaluateEnquirySpamFingerprint,
  extractUserTypedEnquiryBody,
  isGeneratedAlphanumericToken,
  isGeneratedJunkBody,
  SPAM_FINGERPRINT_USER_ERROR,
} from "./spam-fingerprint.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

const BOT_NAME = "7kQm2nR8pA"
const BOT_LOCATION = "b3T9xL0wQ2"
const BOT_BODY = `${"x9".repeat(27)}z`

test("real names and locations are not treated as generated tokens", () => {
  assert.equal(isGeneratedAlphanumericToken("Jane Smith"), false)
  assert.equal(isGeneratedAlphanumericToken("Rishikesh"), false)
  assert.equal(isGeneratedAlphanumericToken("Maximilian"), false)
  assert.equal(isGeneratedAlphanumericToken("New Delhi"), false)
  assert.equal(isGeneratedAlphanumericToken(""), false)
})

test("exactly 10 alphanumeric chars with a digit and no spaces is a generated token", () => {
  assert.equal(isGeneratedAlphanumericToken(BOT_NAME), true)
  assert.equal(isGeneratedAlphanumericToken(BOT_LOCATION), true)
  assert.equal(isGeneratedAlphanumericToken("0123456789"), true)
  assert.equal(isGeneratedAlphanumericToken("Abcdefghij"), false)
  assert.equal(isGeneratedAlphanumericToken("7kQm2nR8p"), false)
})

test("junk bodies are ~55 letters+digits with no spaces", () => {
  assert.equal(BOT_BODY.length, 55)
  assert.equal(isGeneratedJunkBody(BOT_BODY), true)
  assert.equal(
    isGeneratedJunkBody("Please tell me more about the Rishikesh 2027 retreat."),
    false
  )
  assert.equal(isGeneratedJunkBody("Jane Smith is interested"), false)
})

test("Interest/Location prefixes are ignored so the user-typed body is validated", () => {
  const stored = composeRetreatEnquiryMessage({
    interest: "rishikesh-2027",
    location: BOT_LOCATION,
    message: BOT_BODY,
  })
  assert.match(String(stored), /^Interest:/)
  assert.match(String(stored), /Location:/)
  assert.equal(extractUserTypedEnquiryBody(stored), BOT_BODY)

  const match = evaluateEnquirySpamFingerprint({
    name: BOT_NAME,
    message: stored,
    metadata: { location: BOT_LOCATION },
  })
  assert.equal(match.matched, true)
  assert.deepEqual(match.reasons, [
    "generated_name",
    "generated_location",
    "generated_message_body",
  ])
})

test("legitimate retreat payloads are allowed", () => {
  const stored = composeRetreatEnquiryMessage({
    interest: "rishikesh-2027",
    location: "Rishikesh",
    message: "I would like dates for two people in March.",
  })
  const match = evaluateEnquirySpamFingerprint({
    name: "Jane Smith",
    message: stored,
    metadata: { location: "Rishikesh" },
  })
  assert.equal(match.matched, false)
  assert.deepEqual(match.reasons, [])
})

test("enquiry core rejects the fingerprint after rate limit and never inserts or deletes", () => {
  const core = readSrc("features/leads/services/enquiry-submission.core.ts")
  const honeypotIdx = core.indexOf("isHoneypotTriggered(parsed.data")
  const rateIdx = core.indexOf("await deps.consumeRateLimit")
  const memoryRateIdx = core.indexOf("if (isEnquiryRateLimited")
  const fingerprintIdx = core.indexOf("evaluateEnquirySpamFingerprint({")
  const insertIdx = core.indexOf("await deps.insertLead")

  assert.ok(honeypotIdx > 0)
  assert.ok(rateIdx > honeypotIdx)
  assert.ok(memoryRateIdx > rateIdx)
  assert.ok(fingerprintIdx > memoryRateIdx)
  assert.ok(insertIdx > fingerprintIdx)
  assert.match(core, /SPAM_FINGERPRINT_USER_ERROR/)
  assert.match(core, /spam_rejected/)
  assert.doesNotMatch(core, /\.delete\(/)

  const fingerprintSlice = core.slice(fingerprintIdx, insertIdx)
  assert.match(fingerprintSlice, /matched/)
  assert.doesNotMatch(fingerprintSlice, /insertLead/)
})

test("user-facing fingerprint error stays generic and logger must not receive PII keys", () => {
  assert.equal(
    SPAM_FINGERPRINT_USER_ERROR,
    "Unable to submit your request right now. Please try again."
  )
  const service = readSrc("features/leads/services/leads.service.ts")
  assert.match(service, /Enquiry spam fingerprint rejected/)
  assert.match(service, /reasons/)
  assert.match(service, /leadType/)
  assert.doesNotMatch(
    service.slice(
      service.indexOf("onSpamFingerprint"),
      service.indexOf("onInsertError")
    ),
    /email|phone|message|name:/
  )
})
