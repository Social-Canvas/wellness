import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  grantsSuperAdminDemoAccess,
  resolveMemberContentAccess,
} from "./super-admin-access.ts"

test("super admin demo access follows the stored role, not an email", () => {
  assert.equal(grantsSuperAdminDemoAccess("super_admin"), true)
  assert.equal(grantsSuperAdminDemoAccess("admin"), false)
  assert.equal(grantsSuperAdminDemoAccess("user"), false)
  assert.equal(grantsSuperAdminDemoAccess(null), false)
  assert.equal(grantsSuperAdminDemoAccess(undefined), false)
})

test("super admin can open content without an entitlement", () => {
  assert.equal(
    resolveMemberContentAccess({ role: "super_admin", hasEntitlement: false }),
    true
  )
})

test("a normal user without an entitlement stays locked", () => {
  assert.equal(
    resolveMemberContentAccess({ role: "user", hasEntitlement: false }),
    false
  )
  assert.equal(
    resolveMemberContentAccess({ role: "admin", hasEntitlement: false }),
    false
  )
})

test("an entitled member keeps access", () => {
  assert.equal(
    resolveMemberContentAccess({ role: "user", hasEntitlement: true }),
    true
  )
  assert.equal(
    resolveMemberContentAccess({ role: null, hasEntitlement: true }),
    true
  )
})

test("entitlement and membership entry points consult super admin access", () => {
  const entitlement = readFileSync(
    new URL("./entitlement.service.ts", import.meta.url),
    "utf8"
  )
  const membership = readFileSync(
    new URL("./membership.service.ts", import.meta.url),
    "utf8"
  )

  for (const name of [
    "canAccessCourse",
    "canAccessLesson",
    "canAccessRecordedSessions",
    "canAccessLiveOnlineSessions",
  ]) {
    assert.match(entitlement, new RegExp(`export const ${name}`))
  }
  assert.match(entitlement, /export async function canAccessVideo/)
  assert.match(entitlement, /export async function canDownloadProduct/)

  assert.match(entitlement, /profileHasSuperAdminDemoAccess/)
  assert.match(membership, /profileHasSuperAdminDemoAccess/)
  const downloads = readFileSync(
    new URL("../../features/shop/services/shop.service.ts", import.meta.url),
    "utf8"
  )
  const membershipPage = readFileSync(
    new URL(
      "../../app/(dashboard)/dashboard/membership/page.tsx",
      import.meta.url
    ),
    "utf8"
  )
  assert.match(downloads, /profileHasSuperAdminDemoAccess/)
  assert.match(membershipPage, /grantsSuperAdminDemoAccess/)
  assert.match(membershipPage, /Super admin demo/)
  assert.doesNotMatch(entitlement, /elevate\.ritika@gmail\.com|ritika\.bizz@gmail\.com/)
  assert.doesNotMatch(membership, /elevate\.ritika@gmail\.com|ritika\.bizz@gmail\.com/)
})
