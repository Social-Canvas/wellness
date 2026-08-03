import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

import {
  CERTIFICATE_NAME_COPY,
  isCertificateNameLocked,
  normalizeCertificateName,
  resolveCertificateNameNextPath,
  slugifyCertificateRecipientName,
  validateCertificateName,
} from "./certificate-name.ts"

const ROOT = join(import.meta.dirname, "../../../..")

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8")
}

// 1. Signup requires a certificate name.
test("1. Signup requires a certificate name", () => {
  assert.equal(validateCertificateName("").ok, false)
  const schema = read("src/features/auth/schemas/signup.ts")
  assert.match(schema, /certificateName:\s*certificateNameField/)
  assert.doesNotMatch(schema, /fullName:\s*fullNameField/)
})

// 2. Signup requires permanence confirmation.
test("2. Signup requires permanence confirmation", () => {
  const schema = read("src/features/auth/schemas/signup.ts")
  assert.match(schema, /confirmCertificateName:\s*certificateNameConfirmField/)
  const form = read("src/features/auth/components/SignupForm.tsx")
  assert.match(form, /confirmCertificateName/)
  assert.match(form, /CERTIFICATE_NAME_COPY\.signupConfirm/)
})

// 3. Name is normalized server-side.
test("3. Name is normalized server-side", () => {
  assert.equal(normalizeCertificateName("  Deepa   Pattani  "), "Deepa Pattani")
  const validated = validateCertificateName("  Mary-Jane   O'Connor ")
  assert.equal(validated.ok, true)
  if (validated.ok) {
    assert.equal(validated.value, "Mary-Jane O'Connor")
  }
})

// 4. Unicode names are accepted.
test("4. Unicode names are accepted", () => {
  for (const name of ["深田 あゆみ", "José García", "Анна Иванова", "डॉ अ पटेल"]) {
    const result = validateCertificateName(name)
    assert.equal(result.ok, true, `expected accept: ${name}`)
  }
})

// 5. Control characters and markup-like input are rejected.
test("5. Control characters and markup-like input are rejected", () => {
  for (const name of [
    "Deepa\nPattani",
    "Deepa\tPattani",
    "<script>alert(1)</script>",
    "Deepa <b>Pattani</b>",
    "http://evil.example",
    "Name &amp; Co",
  ]) {
    const result = validateCertificateName(name)
    assert.equal(result.ok, false, `expected reject: ${name}`)
  }
})

// 6. Existing user without a name is redirected to onboarding.
test("6. Existing user without a name is redirected to onboarding", () => {
  const layout = read("src/app/(dashboard)/dashboard/layout.tsx")
  const gate = read("src/features/auth/utils/require-locked-certificate-name.ts")
  assert.match(layout, /requireLockedCertificateName/)
  assert.match(gate, /\/certificate-name\?next=/)
  assert.equal(
    isCertificateNameLocked({ certificateName: null, certificateNameLockedAt: null }),
    false
  )
})

// 7. User with a locked name is not redirected.
test("7. User with a locked name is not redirected", () => {
  assert.equal(
    isCertificateNameLocked({
      certificateName: "Deepa Pattani",
      certificateNameLockedAt: "2026-08-03T00:00:00.000Z",
    }),
    true
  )
  const page = read("src/app/(auth)/certificate-name/page.tsx")
  assert.match(page, /isCertificateNameLocked/)
  assert.match(page, /redirect\(nextPath\)/)
})

// 8. Original destination is restored after completion.
test("8. Original destination is restored after completion", () => {
  assert.equal(
    resolveCertificateNameNextPath("/dashboard/library/abc"),
    "/dashboard/library/abc"
  )
  assert.equal(resolveCertificateNameNextPath("//evil.com"), "/dashboard/library")
  assert.equal(resolveCertificateNameNextPath(undefined), "/dashboard/library")
  const form = read("src/features/auth/components/CertificateNameOnboardingForm.tsx")
  assert.match(form, /resolveCertificateNameNextPath/)
})

// 9. Name can be set exactly once by the user.
test("9. Name can be set exactly once by the user", () => {
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.match(migration, /set_certificate_name_once/)
  assert.match(migration, /certificate_name_locked_at is null/)
  const service = read("src/features/auth/services/certificate-name.service.ts")
  assert.match(service, /setCertificateNameOnce/)
  assert.match(service, /rpc\("set_certificate_name_once"/)
})

// 10. Second ordinary-user update is rejected.
test("10. Second ordinary-user update is rejected", () => {
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.match(migration, /already_locked/)
  assert.match(
    migration,
    /Your certificate name is already confirmed and cannot be changed/
  )
})

// 11. Two simultaneous set attempts cannot overwrite each other.
test("11. Two simultaneous set attempts cannot overwrite each other", () => {
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.match(migration, /for update/)
  assert.match(
    migration,
    /where id = v_profile_id\s+and certificate_name_locked_at is null/i
  )
})

// 12. Direct profile update is denied by RLS / privileges / trigger.
test("12. Direct profile update is denied by RLS", () => {
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.match(migration, /prevent_certificate_name_direct_update/)
  assert.match(migration, /revoke update on table public\.profiles from authenticated/)
  assert.match(
    migration,
    /grant update \(\s*full_name,\s*phone,\s*avatar_url,\s*updated_at\s*\)/i
  )
})

// 13. User cannot set another user’s name.
test("13. User cannot set another user’s name", () => {
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.match(migration, /auth\.uid\(\)/)
  assert.match(migration, /where auth_user_id = v_auth_uid/)
  const service = read("src/features/auth/services/certificate-name.service.ts")
  assert.doesNotMatch(service, /p_user_id|targetUserId|anotherUser/)
})

// 14. Locked name appears read-only on Account.
test("14. Locked name appears read-only on Account", () => {
  const account = read("src/app/(dashboard)/dashboard/account/page.tsx")
  assert.match(account, /Certificate name/)
  assert.match(account, /profile\.certificateName/)
  assert.doesNotMatch(account, /register\("certificateName"\)/)
  assert.match(account, /Contact\s+support if a correction is required/)
})

// 15. Certificate issuance uses the locked name.
test("15. Certificate issuance uses the locked name", () => {
  const service = read(
    "src/features/certificates/services/certificates.service.ts"
  )
  assert.match(service, /getProfileForCertificateIssuance/)
  assert.match(service, /certificate_name_required/)
  assert.match(service, /recipient_name: profileResult\.data\.certificateName/)
})

// 16. Certificate record snapshots recipient_name.
test("16. Certificate record snapshots recipient_name", () => {
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.match(migration, /add column if not exists recipient_name text/)
  const types = read("src/features/certificates/types/index.ts")
  assert.match(types, /recipientName/)
})

// 17. Previously issued certificate does not change after profile correction.
test("17. Previously issued certificate does not change after profile correction", () => {
  const service = read("src/features/auth/services/certificate-name.service.ts")
  assert.match(service, /admin_correct_certificate_name/)
  assert.match(service, /adminReissueCertificateRecipientName/)
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.doesNotMatch(
    migration,
    /admin_correct_certificate_name[\s\S]*update public\.certificates/
  )
  const correctForm = read(
    "src/features/members/components/certificate-name-correct-form.tsx"
  )
  assert.match(correctForm, /Issued certificates were not changed/)
})

// 18. Missing certificate name blocks certificate issuance safely.
test("18. Missing certificate name blocks certificate issuance safely", () => {
  const service = read(
    "src/features/certificates/services/certificates.service.ts"
  )
  assert.match(
    service,
    /Confirm your certificate name before requesting a certificate/
  )
})

// 19. Email address is never used as the certificate name.
test("19. Email address is never used as the certificate name", () => {
  const service = read(
    "src/features/certificates/services/certificates.service.ts"
  )
  assert.doesNotMatch(service, /email\?\.split\("@"\)/)
  assert.doesNotMatch(service, /profiles \( full_name, email \)/)
  const util = read("src/features/auth/utils/certificate-name.ts")
  assert.doesNotMatch(util, /split\("@\"\)/)
})

// 20. "Your Name" placeholder is never rendered on issued certificates.
test("20. Your Name placeholder is never rendered on issued certificates", () => {
  const verify = read(
    "src/features/certificates/services/certificates.service.ts"
  )
  assert.doesNotMatch(verify, /"Your Name"/)
  assert.doesNotMatch(verify, /"Member"/)
  assert.match(verify, /recipient_name\?\.trim\(\)/)
  const view = read(
    "src/features/certificates/components/CertificateVerifyView.tsx"
  )
  assert.match(view, /certificate\.recipientName/)
  assert.doesNotMatch(view, /Your Name/)
})

// 21. Admin correction requires authorization.
test("21. Admin correction requires authorization", () => {
  const service = read("src/features/auth/services/certificate-name.service.ts")
  assert.match(service, /Only administrators can correct certificate names/)
  assert.match(service, /ADMIN_ROLES/)
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.match(migration, /v_admin_role not in \('admin', 'super_admin'\)/)
})

// 22. Admin correction requires a reason.
test("22. Admin correction requires a reason", () => {
  const schema = read("src/features/auth/schemas/certificate-name.ts")
  assert.match(schema, /reason:\s*z/)
  assert.match(schema, /Provide a correction reason/)
  assert.match(schema, /confirmCorrection:\s*z\.literal\(true/)
})

// 23. Admin correction creates an audit record.
test("23. Admin correction creates an audit record", () => {
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.match(migration, /create table if not exists public\.certificate_name_audit/)
  assert.match(migration, /insert into public\.certificate_name_audit/)
})

// 24. Existing membership, Stripe and course access remain unchanged.
test("24. Existing membership, Stripe and course access remain unchanged", () => {
  const migration = read(
    "supabase/migrations/20260803210000_locked_certificate_names.sql"
  )
  assert.doesNotMatch(migration, /subscriptions/)
  assert.doesNotMatch(migration, /stripe/i)
  assert.doesNotMatch(migration, /content_access/)
  assert.doesNotMatch(migration, /alter table public\.videos/)
  assert.doesNotMatch(migration, /alter table public\.live_classes/)
})

test("supported Latin certificate name examples remain valid", () => {
  for (const name of ["Deepa Pattani", "Mary-Jane O'Connor", "Dr. A. Patel"]) {
    const result = validateCertificateName(name)
    assert.equal(result.ok, true)
  }
})

test("set-once schema requires confirmation checkbox", () => {
  const schema = read("src/features/auth/schemas/certificate-name.ts")
  assert.match(schema, /confirmSpelling:\s*certificateNameConfirmField/)
  assert.match(schema, /source:\s*z\.enum\(\["signup", "onboarding"\]/)
})

test("copy constants match product requirements", () => {
  assert.equal(
    CERTIFICATE_NAME_COPY.signupHelp,
    "Enter your name exactly as you want it to appear on certificates."
  )
  assert.match(CERTIFICATE_NAME_COPY.lockedAccountHelpShort, /locked/)
})

test("slugify never invents an email-derived name", () => {
  assert.equal(slugifyCertificateRecipientName("Deepa Pattani"), "deepa-pattani")
  assert.notEqual(slugifyCertificateRecipientName("Deepa Pattani"), "deepa")
})

test("onboarding form includes live preview and logout", () => {
  const form = read(
    "src/features/auth/components/CertificateNameOnboardingForm.tsx"
  )
  assert.match(form, /Certificate preview/)
  assert.match(form, /Log out/)
  assert.match(form, /aria-describedby/)
  assert.match(form, /break-words/)
})

test("proxy preserves pathname for gate redirects and avoids public-page gates", () => {
  const proxy = read("src/lib/supabase/proxy.ts")
  assert.match(proxy, /x-pathname/)
  assert.match(proxy, /isProtectedPath/)
  const publicHome = read("src/app/(public)/page.tsx")
  assert.doesNotMatch(publicHome, /requireLockedCertificateName/)
})

test("capitalization entered by the user is preserved", () => {
  const result = validateCertificateName("mAry-Jane O'Connor")
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value, "mAry-Jane O'Connor")
  }
})
