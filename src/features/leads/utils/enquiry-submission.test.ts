import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { afterEach, test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  ENQUIRY_HONEYPOT_FIELD,
  isHoneypotTriggered,
  submitLeadSchema,
} from "../schemas/submit-lead.ts"
import {
  ENQUIRY_RATE_LIMIT,
  isEnquiryRateLimited,
  recordEnquiryAttempt,
  resetEnquiryRateLimitStateForTests,
} from "./enquiry-rate-limit.ts"
import { getEnquiryNotificationTo } from "./enquiry-config.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

afterEach(() => {
  resetEnquiryRateLimitStateForTests()
  delete process.env.ENQUIRY_NOTIFICATION_TO
})

test("validation rejects invalid lead payloads", () => {
  const bad = submitLeadSchema.safeParse({
    leadType: "vip",
    name: "Alex",
    email: "not-an-email",
  })
  assert.equal(bad.success, false)

  const ok = submitLeadSchema.safeParse({
    leadType: "nonprofit",
    name: "Alex",
    email: "alex@example.com",
  })
  assert.equal(ok.success, true)
})

test("honeypot detection skips persistence path in core", () => {
  assert.equal(isHoneypotTriggered("https://bot.example"), true)
  assert.equal(isHoneypotTriggered(""), false)

  const core = readSrc("features/leads/services/enquiry-submission.core.ts")
  assert.match(core, /isHoneypotTriggered/)
  assert.match(core, /ENQUIRY_HONEYPOT_FIELD/)
  assert.match(
    core,
    /return success\(\{\s*id:\s*crypto\.randomUUID\(\)\s*\}\)/
  )
  assert.doesNotMatch(
    core.slice(
      core.indexOf("isHoneypotTriggered"),
      core.indexOf("isEnquiryRateLimited")
    ),
    /insertLead/
  )
})

test("rate limit blocks further attempts in the window", () => {
  const email = "limit@example.com"
  const ip = "198.51.100.4"
  for (let i = 0; i < ENQUIRY_RATE_LIMIT.maxSubmissions; i += 1) {
    recordEnquiryAttempt(email, ip)
  }
  assert.equal(isEnquiryRateLimited(email, ip), true)

  const core = readSrc("features/leads/services/enquiry-submission.core.ts")
  assert.match(core, /isEnquiryRateLimited/)
  assert.match(core, /rate_limited/)
})

test("notification failure does not fail submission after insert", () => {
  const core = readSrc("features/leads/services/enquiry-submission.core.ts")
  // Insert happens before notify; success returns even when notify fails.
  const insertIdx = core.indexOf("await deps.insertLead")
  const adminIdx = core.indexOf("deps.sendAdminNotification")
  const successIdx = core.lastIndexOf("return success({ id: data.id })")
  assert.ok(insertIdx > 0)
  assert.ok(adminIdx > insertIdx)
  assert.ok(successIdx > adminIdx)
  assert.match(core, /catch \(error\)[\s\S]*status: "failed"/)
  assert.match(core, /updateNotificationStatuses/)
})

test("missing ENQUIRY_NOTIFICATION_TO is optional and skipped safely", () => {
  assert.equal(getEnquiryNotificationTo(), null)
  process.env.ENQUIRY_NOTIFICATION_TO = "ops@elevate.example"
  assert.equal(getEnquiryNotificationTo(), "ops@elevate.example")
  delete process.env.ENQUIRY_NOTIFICATION_TO
  assert.equal(getEnquiryNotificationTo(), null)

  const emailService = readSrc(
    "server/integrations/resend/enquiry-email.service.ts"
  )
  assert.match(
    emailService,
    /ENQUIRY_NOTIFICATION_TO is not configured/
  )
  assert.match(emailService, /status: "skipped"/)
  assert.match(emailService, /bypassAllowlist: true/)
})

test("insert failure returns provider_error without success", () => {
  const core = readSrc("features/leads/services/enquiry-submission.core.ts")
  assert.match(core, /if \(!data\)/)
  assert.match(core, /provider_error/)
  assert.doesNotMatch(
    core.slice(core.indexOf("if (!data)"), core.indexOf("const snapshot")),
    /return success/
  )
})

test("service uses admin client and nonprofit canonical type", () => {
  const service = readSrc("features/leads/services/leads.service.ts")
  assert.match(service, /createAdminClient/)
  assert.match(service, /leadType: "nonprofit"/)
  assert.doesNotMatch(service, /leadType: "private_event"/)
  assert.match(service, /submitEnquiryCore/)

  const forms = [
    readSrc("features/leads/components/LeadEnquiryForm.tsx"),
    readSrc("features/leads/components/LeadCaptureForm.tsx"),
    readSrc("features/leads/components/NonprofitPartnershipForm.tsx"),
  ]
  for (const form of forms) {
    assert.match(form, /ENQUIRY_HONEYPOT_FIELD/)
    assert.match(form, /sr-only/)
  }

  assert.equal(ENQUIRY_HONEYPOT_FIELD, "companyUrl")
})

test("admin notification escapes user HTML via layout helper", () => {
  const notification = readSrc("features/leads/utils/enquiry-notification.ts")
  const layout = readSrc("emails/elevate-email-layout.ts")
  assert.match(notification, /We received your Elevate enquiry/)
  assert.match(notification, /not been added to a marketing list/)
  assert.match(layout, /function escapeHtml/)
  assert.match(notification, /Reply-To|reply to this email/i)
})
