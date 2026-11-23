/**
 * Super Admin demo access is role-based.
 * Email addresses never grant content. Admin is not included.
 */

export function grantsSuperAdminDemoAccess(
  role: string | null | undefined
): boolean {
  return role === "super_admin"
}

/**
 * Published member content is open to a real super_admin profile.
 * Everyone else keeps the entitlement result, including entitled members.
 */
export function resolveMemberContentAccess(input: {
  role: string | null | undefined
  hasEntitlement: boolean
}): boolean {
  if (grantsSuperAdminDemoAccess(input.role)) {
    return true
  }

  return input.hasEntitlement
}
