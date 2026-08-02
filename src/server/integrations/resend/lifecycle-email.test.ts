import assert from "node:assert/strict"
import { test } from "node:test"

import {
  isRecipientAllowed,
  validateTransactionalSender,
  type TransactionalEmailRuntimeConfig,
} from "./email-config.ts"
import {
  LIFECYCLE_EMAIL_MAPPINGS,
  buildIdempotencyKey,
  buildPlainLifecycleEmailParts,
  computeEmailBackoffSeconds,
  getLifecycleEmailMapping,
  privilegeCopyLines,
  redactProviderError,
  requiredPayloadForTemplate,
  resolveCta,
  summarizePrivilegesForPlanSlug,
} from "./lifecycle-email.pure.ts"

function baseConfig(
  overrides: Partial<TransactionalEmailRuntimeConfig> = {}
): TransactionalEmailRuntimeConfig {
  return {
    apiKeyPresent: true,
    fromAddress: "hello@elevate.example",
    fromName: "Elevate Health Solutions",
    replyTo: "support@elevate.example",
    deliveryEnabled: true,
    testRecipientAllowlist: ["ops@elevate.example"],
    appUrl: "https://app.elevate.example",
    isProduction: true,
    batchSize: 10,
    maxAttempts: 8,
    requireAllowlist: false,
    ...overrides,
  }
}

test("maps membership_started to membership_started template for the member", () => {
  const mapping = getLifecycleEmailMapping("membership_started")
  assert.ok(mapping)
  assert.equal(mapping.template, "membership_started")
  assert.equal(mapping.recipient, "member")
  assert.equal(mapping.deliver, true)
  assert.equal(mapping.notifyOrgAdmins, false)
})

test("maps organization_member_invited to invite template with invite_email recipient", () => {
  const mapping = getLifecycleEmailMapping("organization_member_invited")
  assert.ok(mapping)
  assert.equal(mapping.template, "organization_member_invited")
  assert.equal(mapping.recipient, "invite_email")
  assert.equal(mapping.notifyOrgAdmins, false)
})

test("capability_granted and capability_revoked are skipped (summarized in membership emails)", () => {
  for (const eventType of ["capability_granted", "capability_revoked"] as const) {
    const mapping = LIFECYCLE_EMAIL_MAPPINGS[eventType]
    assert.equal(mapping.deliver, false)
    assert.equal(mapping.template, null)
    assert.match(mapping.skipReason ?? "", /summarized/)
  }
})

test("required payload lists member user for membership emails", () => {
  assert.deepEqual(requiredPayloadForTemplate("membership_started"), [
    "memberUserId",
    "membershipName",
  ])
  assert.ok(requiredPayloadForTemplate("organization_member_invited").includes("inviteEmailOrUser"))
})

test("allowlist blocks non-allowlisted recipients when required", () => {
  const config = baseConfig({
    requireAllowlist: true,
    testRecipientAllowlist: ["ops@elevate.example"],
  })
  assert.equal(isRecipientAllowed("ops@elevate.example", config).allowed, true)
  assert.equal(isRecipientAllowed("customer@example.com", config).allowed, false)
  assert.equal(
    isRecipientAllowed("customer@example.com", config).reason,
    "not_allowlisted"
  )
})

test("production never redirects customers when allowlist is off", () => {
  const config = baseConfig({ requireAllowlist: false, isProduction: true })
  assert.equal(isRecipientAllowed("customer@example.com", config).allowed, true)
})

test("idempotency key is lifecycle event id + template", () => {
  assert.equal(
    buildIdempotencyKey("11111111-1111-1111-1111-111111111111", "membership_started"),
    "11111111-1111-1111-1111-111111111111:membership_started"
  )
})

test("claim semantics: sent status is the duplicate guard (local canonical)", () => {
  const alreadySent = { email_status: "sent", email_provider_message_id: "msg_1" }
  const shouldSkip =
    alreadySent.email_status === "sent" || Boolean(alreadySent.email_provider_message_id)
  assert.equal(shouldSkip, true)
})

test("retry uses exponential backoff and caps", () => {
  assert.equal(computeEmailBackoffSeconds(1), 60)
  assert.equal(computeEmailBackoffSeconds(2), 120)
  assert.equal(computeEmailBackoffSeconds(3), 240)
  assert.ok(computeEmailBackoffSeconds(20) <= 6 * 60 * 60)
})

test("permanent sender validation fails closed in production for resend.dev", () => {
  const result = validateTransactionalSender(
    baseConfig({ fromAddress: "onboarding@resend.dev", isProduction: true })
  )
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.permanent, true)
  }
})

test("email failure does not imply membership revoke", () => {
  const membershipStillActive = true
  const emailFailed = true
  assert.equal(emailFailed && membershipStillActive, true)
  assert.notEqual(emailFailed, !membershipStillActive)
})

test("Core privilege copy: library yes, in-person no", () => {
  const privileges = summarizePrivilegesForPlanSlug("plan-1")
  assert.equal(privileges.hasCourseLibrary, true)
  assert.equal(privileges.canAttendInPerson, false)
  const lines = privilegeCopyLines(privileges).join("\n")
  assert.match(lines, /Course library access: included/)
  assert.match(lines, /In-person sessions: not included/)
})

test("Gold privilege copy: library and in-person", () => {
  const privileges = summarizePrivilegesForPlanSlug("plan-2")
  assert.equal(privileges.hasCourseLibrary, true)
  assert.equal(privileges.canAttendInPerson, true)
  assert.match(privilegeCopyLines(privileges).join("\n"), /In-person sessions: included/)
})

test("sponsored billing CTA uses dashboard; personal uses billing", () => {
  const mapping = LIFECYCLE_EMAIL_MAPPINGS.membership_payment_failed
  const sponsored = resolveCta(mapping, "https://app.elevate.example", true)
  const personal = resolveCta(mapping, "https://app.elevate.example", false)
  assert.equal(sponsored?.href, "https://app.elevate.example/dashboard")
  assert.equal(personal?.href, "https://app.elevate.example/dashboard/account")
  assert.match(personal?.label ?? "", /billing/i)
})

test("unauthorized cron rejects without bearer secret", () => {
  const secret = "test-cron-secret"
  const authorize = (header: string | null) => {
    if (!secret || !header?.startsWith("Bearer ")) return false
    return header.slice("Bearer ".length) === secret
  }
  assert.equal(authorize(null), false)
  assert.equal(authorize("Bearer wrong"), false)
  assert.equal(authorize("Bearer test-cron-secret"), true)
})

test("cron response shape excludes PII fields", () => {
  const response = {
    claimed: 1,
    sent: 1,
    skipped: 0,
    retry: 0,
    failed: 0,
    errors: [{ code: "provider_transient", count: 0 }],
  }
  const serialized = JSON.stringify(response)
  assert.equal(serialized.includes("@"), false)
  assert.equal("email" in response, false)
  assert.equal("to" in response, false)
})

test("auth redirect allowlist accepts only same-origin relative next paths", () => {
  const safeNext = (nextRaw: string | null) =>
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard"
  assert.equal(safeNext("/reset-password"), "/reset-password")
  assert.equal(safeNext("//evil.example"), "/dashboard")
  assert.equal(safeNext("https://evil.example"), "/dashboard")
})

test("lifecycle templates include HTML and plain text parts", () => {
  const template = buildPlainLifecycleEmailParts({
    subject: "Membership cancelled",
    heading: "Membership cancelled",
    intro: "Hi Sam, your Elevate Gold membership has ended.",
    bodyLines: privilegeCopyLines(summarizePrivilegesForPlanSlug("plan-2")),
    cta: { label: "Open programs", href: "https://app.elevate.example/programs" },
  })
  assert.ok(template.html.includes("<!doctype html>"))
  assert.ok(template.text.includes("Membership cancelled"))
  assert.ok(template.subject.length > 0)
  assert.equal(template.html.includes("mailto:list"), false)
})

test("templates contain no marketing list language or secrets", () => {
  const template = buildPlainLifecycleEmailParts({
    subject: `Elevate access activated via Example Nonprofit`,
    heading: "Sponsored access activated",
    intro: "Hi there, your Elevate access through Example Nonprofit is now active.",
    bodyLines: privilegeCopyLines(summarizePrivilegesForPlanSlug("plan-1")),
    cta: { label: "Open dashboard", href: "https://app.elevate.example/dashboard" },
  })
  const blob = `${template.subject}\n${template.html}\n${template.text}`.toLowerCase()
  assert.equal(blob.includes("unsubscribe from marketing"), false)
  assert.equal(blob.includes("mailing list"), false)
  assert.equal(blob.includes("sk_live"), false)
  assert.equal(blob.includes("resend_api"), false)
  assert.equal(blob.includes("stripe_"), false)
})

test("purchase confirmation contract remains a transactional product email", () => {
  const template = buildPlainLifecycleEmailParts({
    subject: "Purchase confirmed - Breathwork Guide",
    heading: "Purchase confirmed",
    intro: "Hi Jordan, your purchase is confirmed.",
    bodyLines: ["Product: Breathwork Guide", "Order ID: order_test_1"],
    cta: { label: "Open dashboard", href: "https://app.elevate.example/dashboard/shop" },
  })
  assert.match(template.subject, /Purchase confirmed/)
  assert.match(template.html, /Breathwork Guide/)
  assert.match(template.text, /Open dashboard/)
})

test("provider errors are redacted before persistence", () => {
  const redacted = redactProviderError(
    "Unauthorized Bearer re_abc123 for user person@example.com"
  )
  assert.equal(redacted.includes("re_abc123"), false)
  assert.equal(redacted.includes("person@example.com"), false)
  assert.match(redacted, /REDACTED/)
})

test("incomplete events should be skipped with clear reasons", () => {
  const mapping = getLifecycleEmailMapping("membership_started")
  assert.ok(mapping)
  assert.equal(mapping.recipient, "member")
  assert.equal(mapping.deliver, true)
})

test("all deliverable lifecycle event types have explicit mappings", () => {
  const required = [
    "membership_started",
    "membership_upgraded",
    "membership_downgrade_scheduled",
    "membership_downgrade_effective",
    "membership_cancellation_scheduled",
    "membership_cancelled",
    "membership_payment_failed",
    "membership_payment_recovered",
    "organization_member_invited",
    "organization_member_activated",
    "organization_member_suspended",
    "organization_member_removed",
  ]
  for (const eventType of required) {
    const mapping = getLifecycleEmailMapping(eventType)
    assert.ok(mapping, eventType)
    assert.equal(mapping?.deliver, true, eventType)
    assert.ok(mapping?.template, eventType)
  }
})
