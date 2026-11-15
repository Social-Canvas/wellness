import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { afterEach, test } from "node:test"
import { fileURLToPath } from "node:url"

import { flagBotRecordSchema } from "./schemas/flag-bot.ts"
import {
  classifyAccount,
  classifyLead,
  isInternalTestEmail,
} from "./utils/classification.ts"
import { isHoneypotTriggered } from "./utils/honeypot.ts"
import {
  isSignupRateLimited,
  recordSignupAttempt,
  resetSignupRateLimitStateForTests,
  SIGNUP_RATE_LIMIT,
} from "./utils/signup-rate-limit.ts"
import {
  getTurnstileConfig,
  shouldSkipTurnstile,
  verifyTurnstileToken,
} from "./utils/turnstile.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

afterEach(() => {
  resetSignupRateLimitStateForTests()
})

test("internal test emails are high-confidence and safe to auto-flag", () => {
  assert.equal(isInternalTestEmail("e2e@elevate-healthsolutions.com"), true)
  assert.equal(isInternalTestEmail("e2e-user@gmail.com"), true)
  assert.equal(isInternalTestEmail("person@example.com"), true)
  assert.equal(isInternalTestEmail("member@gmail.com"), false)

  const result = classifyAccount({ email: "smoke@elevate-healthsolutions.com" })
  assert.equal(result.class, "A")
  assert.equal(result.recommendedAction, "auto_flag_safe")
  assert.equal(result.internalTest, true)
})

test("unconfirmed inactivity alone is not a bot", () => {
  const result = classifyAccount({
    email: "member@gmail.com",
    emailConfirmed: false,
    lastSignInAt: null,
    hasActivity: false,
  })
  assert.equal(result.class, "D")
  assert.equal(result.recommendedAction, "do_not_flag")
})

test("admin accounts are never classified as bots", () => {
  const result = classifyAccount({
    email: "ops@example.com",
    role: "super_admin",
  })
  assert.equal(result.class, "C")
  assert.equal(result.recommendedAction, "do_not_flag")
})

test("repeat enquiry email is manual review, not auto-flag", () => {
  const result = classifyLead({
    email: "person@web.de",
    name: "Alex Example",
    repeatEmailCount: 6,
  })
  assert.equal(result.class, "B")
  assert.equal(result.recommendedAction, "manual_review")
  assert.equal(result.highConfidence, false)
})

test("retreat spam fingerprint is high-confidence Class A for review, not auto-write", () => {
  const stored = [
    "Interest: Rishikesh 2027 (March or April 2027)",
    "Location: b3T9xL0wQ2",
    `${"x9".repeat(27)}z`,
  ].join("\n")
  const result = classifyLead({
    email: "person@web.de",
    name: "7kQm2nR8pA",
    message: stored,
  })
  assert.equal(result.class, "A")
  assert.equal(result.highConfidence, true)
  assert.equal(result.recommendedAction, "manual_review")
  assert.equal(result.internalTest, false)
})

test("honeypot, signup rate limit, and enquiry rate limit remain in public paths", () => {
  assert.equal(isHoneypotTriggered("https://spam.test"), true)
  const email = "limit@example.com"
  const ip = "198.51.100.9"
  for (let i = 0; i < SIGNUP_RATE_LIMIT.maxAttempts; i += 1) {
    recordSignupAttempt(email, ip)
  }
  assert.equal(isSignupRateLimited(email, ip), true)

  const signupAction = readSrc("src/features/auth/actions/auth.actions.ts")
  const leadAction = readSrc("src/features/leads/actions/leads.actions.ts")
  const enquiryCore = readSrc("src/features/leads/services/enquiry-submission.core.ts")
  assert.match(signupAction, /verifyTurnstileToken/)
  assert.match(signupAction, /isSignupRateLimited/)
  assert.match(signupAction, /consumePublicFormRateLimit/)
  assert.match(signupAction, /SIGNUP_RATE_LIMIT_POLICY/)
  assert.match(signupAction, /AUTH_EMAIL_RATE_LIMIT_POLICY/)
  assert.match(signupAction, /forgotPasswordAction/)
  assert.match(leadAction, /verifyTurnstileToken/)
  assert.match(enquiryCore, /isHoneypotTriggered/)
  assert.match(enquiryCore, /consumeRateLimit/)
  assert.match(enquiryCore, /evaluateEnquirySpamFingerprint/)

  const retreatForm = readSrc("src/features/leads/components/LeadEnquiryForm.tsx")
  const captureForm = readSrc("src/features/leads/components/LeadCaptureForm.tsx")
  const nonprofitForm = readSrc(
    "src/features/leads/components/NonprofitPartnershipForm.tsx"
  )
  const signupForm = readSrc("src/features/auth/components/SignupForm.tsx")
  const turnstileField = readSrc(
    "src/features/bot-protection/components/turnstile-field.tsx"
  )
  for (const form of [retreatForm, captureForm, nonprofitForm, signupForm]) {
    assert.match(form, /TurnstileField/)
  }
  assert.match(turnstileField, /aria-labelledby/)
  assert.match(turnstileField, /Human verification challenge/)
  assert.match(turnstileField, /if \(!siteKey\)/)
})

test("Turnstile skips when keys are unset so local tests do not require secrets", async () => {
  delete process.env.TURNSTILE_SITE_KEY
  delete process.env.TURNSTILE_SECRET_KEY
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const config = getTurnstileConfig()
  assert.equal(shouldSkipTurnstile(config), true)
  const result = await verifyTurnstileToken({ token: "" }, config)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.skipped, true)
  }
})

test("corrective retreat spam migration keeps the lead trigger and the reviewed predicate", () => {
  const migration = readSrc("supabase/migrations/20261116010000_fix_retreat_spam_lead_flags.sql")
  const protection = readSrc("supabase/migrations/20261025180000_bot_review_flags.sql")
  const lowered = migration.toLowerCase()

  assert.match(lowered, /begin;/)
  assert.match(lowered, /commit;/)
  assert.match(lowered, /lock table public\.leads in share row exclusive mode;/)
  assert.match(lowered, /disable trigger leads_protect_bot_columns;/)
  assert.match(lowered, /enable trigger leads_protect_bot_columns;/)
  assert.match(migration, /lead_type = 'retreat'/)
  assert.match(migration, /source = 'retreats_page'/)
  assert.match(migration, /timestamptz '2026-09-09 00:00:00\+00'/)
  assert.match(migration, /timestamptz '2026-09-14 00:00:00\+00'/)
  assert.match(migration, /suspected_bot = false/)
  assert.match(migration, /bot_reason = 'retreat_spam_fingerprint'/)
  assert.doesNotMatch(lowered, /delete from/)
  assert.doesNotMatch(lowered, /update public\.profiles/)
  assert.doesNotMatch(lowered, /bot_flagged_by/)
  assert.doesNotMatch(lowered, /drop trigger/)
  assert.doesNotMatch(lowered, /create or replace function public\.protect_lead_bot_columns/)
  assert.ok(lowered.indexOf("disable trigger") < lowered.indexOf("update public.leads"))
  assert.ok(lowered.indexOf("update public.leads") < lowered.indexOf("enable trigger"))
  assert.match(protection, /create trigger leads_protect_bot_columns/)
  assert.match(protection, /auth\.role\(\) is distinct from 'service_role'/)
})

test("flag schema updates review fields only and never includes delete", () => {
  const parsed = flagBotRecordSchema.safeParse({
    targetType: "profile",
    id: "11111111-1111-4111-8111-111111111111",
    suspected: true,
    reason: "manual_admin_review",
  })
  assert.equal(parsed.success, true)
  const service = readSrc("src/features/bot-protection/services/bot-review.service.ts")
  const migration = readSrc("supabase/migrations/20261025180000_bot_review_flags.sql")
  assert.match(service, /suspected_bot/)
  assert.doesNotMatch(service, /\.delete\(/)
  assert.doesNotMatch(migration, /delete from public\.(profiles|leads)/i)
  assert.match(migration, /add column if not exists suspected_bot/)
})

test("bot review and role changes require admin or super_admin authorization", () => {
  const service = readSrc("src/features/bot-protection/services/bot-review.service.ts")
  const members = readSrc("src/features/members/services/members.service.ts")
  const layout = readSrc("src/app/(admin)/admin/layout.tsx")
  assert.match(service, /requireAdminActor/)
  assert.match(service, /admin.*super_admin|super_admin/)
  assert.match(members, /requireSuperAdminActor/)
  assert.match(layout, /role !== "admin"/)
  assert.match(layout, /role !== "super_admin"/)
})
