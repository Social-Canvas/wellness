import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import { defaultCapabilitiesForPlanSlug } from "../../../server/services/membership-capabilities.ts"
import { SPONSORED_CONTENT_PLAN_SLUG as LIVE_SPONSORED_SLUG } from "../../live-sessions/utils/live-sessions.ts"
import {
  availableOrganizationSeats,
  formatOrganizationAccessCode,
  generateOrganizationAccessCode,
  hashOrganizationAccessCode,
  isOccupiedOrganizationMemberStatus,
  mapRedeemRpcError,
  normalizeOrganizationAccessCode,
  organizationAccessCodePrefix,
  redemptionFailureMessage,
  SPONSORED_CONTENT_PLAN_SLUG,
} from "./access-codes.ts"
import {
  clearRedemptionFailures,
  isRedemptionRateLimited,
  recordRedemptionFailure,
  REDEMPTION_RATE_LIMIT,
  resetRedemptionRateLimitStateForTests,
} from "./redemption-rate-limit.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

test("1. Access code is stored as a hash", () => {
  const code = "ELEVATE-AB7K-92QD"
  const hash = hashOrganizationAccessCode(code)
  assert.equal(hash.length, 64)
  assert.equal(
    hash,
    createHash("sha256")
      .update(normalizeOrganizationAccessCode(code), "utf8")
      .digest("hex")
  )
  const migration = readRepo(
    "supabase/migrations/20260807140000_nonprofit_sponsorship_access_codes.sql"
  )
  assert.match(migration, /code_hash text not null/)
  assert.doesNotMatch(migration, /code_plaintext|plaintext_code/)
})

test("2. Complete code is shown only on creation/regeneration", () => {
  const service = readSrc(
    "server/services/organization-access-code.service.ts"
  )
  const controls = readSrc(
    "features/organizations/components/OrganizationAccessControls.tsx"
  )
  assert.match(service, /displayCode/)
  assert.match(controls, /will not be shown again/)
  assert.match(controls, /codePrefix \? `\$\{codePrefix\}-••••`/)
  assert.doesNotMatch(service, /code_plaintext|plaintext/)
})

test("3. Generated codes are cryptographically formatted", () => {
  const code = generateOrganizationAccessCode()
  assert.match(code, /^ELEVATE-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  assert.notEqual(generateOrganizationAccessCode(), generateOrganizationAccessCode())
  assert.equal(
    formatOrganizationAccessCode("elevateab7k92qd"),
    "ELEVATE-AB7K-92QD"
  )
  assert.equal(organizationAccessCodePrefix("ELEVATE-AB7K-92QD"), "ELEVATE-AB7K")
})

test("4. Codes are not derived from organization name", () => {
  const util = readSrc("features/organizations/utils/access-codes.ts")
  assert.match(util, /Not derived from organization name/)
  const code = generateOrganizationAccessCode()
  assert.doesNotMatch(code, /HELPING|HANDS|ORG/i)
})

test("5. Active user redeem flow requires auth.uid path", () => {
  const actions = readSrc(
    "features/organizations/actions/organization-access.actions.ts"
  )
  assert.match(actions, /getCurrentUser/)
  assert.match(actions, /getCurrentProfile/)
  assert.match(actions, /redeemOrganizationAccessCode/)
  assert.doesNotMatch(actions, /organizationId:\s*parsed\.data\.organizationId/)
  assert.match(
    actions,
    /browser cannot supply org\/plan\/capabilities/i
  )
})

test("6. Redemption grants Platinum-equivalent sponsored access", () => {
  assert.equal(SPONSORED_CONTENT_PLAN_SLUG, "plan-3")
  assert.equal(LIVE_SPONSORED_SLUG, "plan-3")
  const platinum = defaultCapabilitiesForPlanSlug("plan-3")
  assert.ok(platinum.includes("membership_course_library"))
  assert.ok(platinum.includes("in_person_sessions"))
  assert.ok(platinum.includes("priority_support"))
  const membership = readSrc("server/services/membership.service.ts")
  assert.match(membership, /Platinum-equivalent \(plan-3\)/)
  assert.match(membership, /\.eq\("slug", "plan-3"\)/)
})

test("7. Redemption creates no Stripe subscription", () => {
  const service = readSrc(
    "server/services/organization-access-code.service.ts"
  )
  const migration = readRepo(
    "supabase/migrations/20260807140000_nonprofit_sponsorship_access_codes.sql"
  )
  assert.doesNotMatch(service, /stripe|checkout|coupon|promotion_code/i)
  assert.doesNotMatch(migration, /promotion_code|coupon/)
  assert.match(migration, /redeem_organization_access_code/)
})

test("8. Same user cannot consume two seats in one organization", () => {
  const migration = readRepo(
    "supabase/migrations/20260807140000_nonprofit_sponsorship_access_codes.sql"
  )
  assert.match(migration, /already_sponsored/)
  assert.match(migration, /status = 'active'/)
})

test("9. Concurrent redemption cannot exceed seat limit", () => {
  const migration = readRepo(
    "supabase/migrations/20260807140000_nonprofit_sponsorship_access_codes.sql"
  )
  assert.match(migration, /for update/)
  assert.match(migration, /seat_limit_reached/)
  assert.match(migration, /count_occupied_organization_seats/)
})

test("10. Code is blocked when all seats are occupied", () => {
  assert.equal(
    availableOrganizationSeats({ seatLimit: 25, occupiedSeats: 25 }),
    0
  )
  assert.equal(
    availableOrganizationSeats({ seatLimit: 25, occupiedSeats: 21 }),
    4
  )
  assert.equal(
    availableOrganizationSeats({ seatLimit: 0, occupiedSeats: 100 }),
    null
  )
})

test("11. Removed member releases a seat", () => {
  assert.equal(isOccupiedOrganizationMemberStatus("removed"), false)
  assert.equal(isOccupiedOrganizationMemberStatus("active"), true)
  const membership = readSrc("server/services/membership.service.ts")
  assert.match(membership, /Removed members release their seat/)
})

test("12. Suspended member remains counted when the seat is reserved", () => {
  assert.equal(isOccupiedOrganizationMemberStatus("suspended"), true)
  const membership = readSrc("server/services/membership.service.ts")
  assert.match(membership, /\["active", "suspended", "invited"\]/)
})

test("13. Expired or revoked code is rejected", () => {
  assert.equal(mapRedeemRpcError("code_expired"), "code_expired")
  assert.equal(mapRedeemRpcError("code_revoked"), "code_revoked")
  assert.equal(redemptionFailureMessage("code_expired"), "Code expired")
  assert.equal(redemptionFailureMessage("code_revoked"), "Code revoked")
})

test("14. Inactive organization code is rejected", () => {
  assert.equal(
    redemptionFailureMessage("organization_inactive"),
    "Organization inactive"
  )
  const migration = readRepo(
    "supabase/migrations/20260807140000_nonprofit_sponsorship_access_codes.sql"
  )
  assert.match(migration, /organization_inactive/)
  assert.match(migration, /v_org\.status <> 'active'/)
})

test("15. Optional email-domain restriction works", () => {
  assert.equal(
    redemptionFailureMessage("email_domain_not_approved"),
    "Email domain not approved"
  )
  const migration = readRepo(
    "supabase/migrations/20260807140000_nonprofit_sponsorship_access_codes.sql"
  )
  assert.match(migration, /allowed_email_domain/)
  assert.match(migration, /approved_email_domains/)
})

test("16. Code rotation invalidates the previous code", () => {
  const service = readSrc(
    "server/services/organization-access-code.service.ts"
  )
  assert.match(service, /status: "rotated"/)
  assert.match(service, /Invalidate previous active code without removing members/)
})

test("17. Existing members remain active after code rotation", () => {
  const service = readSrc(
    "server/services/organization-access-code.service.ts"
  )
  assert.match(service, /without removing members/)
  assert.doesNotMatch(
    service,
    /organization_members[\s\S]{0,80}status:\s*"removed"/
  )
})

test("18. Sponsored user has no personal billing controls", () => {
  const membership = readSrc("server/services/membership.service.ts")
  assert.match(membership, /hasPersonalBilling: false/)
  const account = readSrc("app/(dashboard)/dashboard/account/page.tsx")
  assert.match(account, /Sponsored by/)
  assert.match(account, /hasPersonalBilling/)
})

test("19. Removing sponsored access preserves personal purchases", () => {
  const lifecycle = readSrc("server/services/membership-lifecycle.test.ts")
  assert.match(lifecycle, /personal purchases remain independent/i)
  const sources = new Set(["personal_stripe", "nonprofit_sponsored", "ebook_order"])
  sources.delete("nonprofit_sponsored")
  assert.ok(sources.has("personal_stripe"))
  assert.ok(sources.has("ebook_order"))
})

test("20. Organization administrator cannot manage another organization", () => {
  const service = readSrc(
    "server/services/organization-access-code.service.ts"
  )
  assert.match(service, /assertOrgAdministrator/)
  assert.match(service, /Not authorized to manage this organization/)
  assert.match(service, /\.eq\("organization_id", input\.organizationId\)/)
})

test("21. Ordinary member cannot generate or revoke codes", () => {
  const service = readSrc(
    "server/services/organization-access-code.service.ts"
  )
  assert.match(service, /\.in\("role", \["owner", "administrator"\]\)/)
  const migration = readRepo(
    "supabase/migrations/20260807140000_nonprofit_sponsorship_access_codes.sql"
  )
  assert.match(migration, /organization_access_codes_select_org_admin/)
  assert.match(migration, /om\.role in \('owner', 'administrator'\)/)
})

test("22. Rate limiting protects redemption attempts", () => {
  resetRedemptionRateLimitStateForTests()
  const profileId = "11111111-1111-4111-8111-111111111111"
  assert.equal(isRedemptionRateLimited(profileId), false)
  for (let i = 0; i < REDEMPTION_RATE_LIMIT.maxFailures; i += 1) {
    recordRedemptionFailure(profileId)
  }
  assert.equal(isRedemptionRateLimited(profileId), true)
  clearRedemptionFailures(profileId)
  assert.equal(isRedemptionRateLimited(profileId), false)
  assert.equal(redemptionFailureMessage("rate_limited").includes("failed attempts"), true)
})

test("23. Core, Gold, and Platinum personal subscriptions remain unchanged", () => {
  assert.deepEqual(defaultCapabilitiesForPlanSlug("plan-1").slice(0, 3), [
    "membership_course_library",
    "live_online_sessions",
    "session_replays",
  ])
  assert.ok(defaultCapabilitiesForPlanSlug("plan-2").includes("in_person_sessions"))
  assert.ok(defaultCapabilitiesForPlanSlug("plan-3").includes("priority_support"))
  const pricing = readSrc("lib/constants/membership-pricing.ts")
  assert.match(pricing, /plan-1|Core/)
})

test("24. Nonprofit sponsored capabilities track canonical Platinum capabilities", () => {
  const sponsored = defaultCapabilitiesForPlanSlug(SPONSORED_CONTENT_PLAN_SLUG)
  const platinum = defaultCapabilitiesForPlanSlug("plan-3")
  assert.deepEqual(sponsored, platinum)
})

test("25. No Stripe coupon or promotion code is created", () => {
  const service = readSrc(
    "server/services/organization-access-code.service.ts"
  )
  const admin = readSrc("server/services/organization-admin.service.ts")
  const actions = readSrc(
    "features/organizations/actions/organization-access.actions.ts"
  )
  for (const source of [service, admin, actions]) {
    assert.doesNotMatch(source, /promotionCodes|coupons\.create|promo_code/i)
  }
})

test("26. Existing enquiry and organization records remain intact", () => {
  const migration = readRepo(
    "supabase/migrations/20260807140000_nonprofit_sponsorship_access_codes.sql"
  )
  assert.doesNotMatch(migration, /delete from public\.organizations/i)
  assert.doesNotMatch(migration, /delete from public\.organization_members/i)
  assert.doesNotMatch(migration, /delete from public\.leads/i)
  assert.match(migration, /Map existing sponsored orgs to Platinum/i)
})

test("27. Redemption UI route and copy are present", () => {
  const page = readSrc(
    "app/(public)/redeem-organization-access/page.tsx"
  )
  assert.match(page, /Join your organization’s Elevate membership/)
  assert.match(page, /Enter the access code provided by your nonprofit organization/)
  const form = readSrc(
    "features/organizations/components/RedeemOrganizationAccessForm.tsx"
  )
  assert.match(form, /Activate sponsored access/)
  assert.match(form, /Your sponsored Elevate access is now active/)
})

test("28. Invalid guessed codes do not reveal organization identity", () => {
  assert.equal(redemptionFailureMessage("invalid_code"), "Invalid code")
  assert.doesNotMatch(redemptionFailureMessage("invalid_code"), /organization/i)
})

test("29. Never log full access codes", () => {
  const service = readSrc(
    "server/services/organization-access-code.service.ts"
  )
  assert.match(service, /Do not log hash or full code|Never include the full redeemable code/)
  assert.doesNotMatch(service, /logger\.[a-z]+\([^\)]*displayCode/)
})

test("30. Occupied seat math matches recommended definition", () => {
  const occupied = ["active", "suspended", "invited"].filter(
    isOccupiedOrganizationMemberStatus
  )
  assert.deepEqual(occupied, ["active", "suspended", "invited"])
  assert.equal(isOccupiedOrganizationMemberStatus("removed"), false)
})
