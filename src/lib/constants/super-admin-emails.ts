/**
 * Operator emails that are allowed to hold Super Admin.
 * App code never auto-promotes these in production. Grant via SQL or
 * Admin → Members after a Super Admin already exists.
 */
export const SUPER_ADMIN_OPERATOR_EMAILS = [
  "ritika.bizz@gmail.com",
  "elevate.ritika@gmail.com",
] as const

export type SuperAdminOperatorEmail = (typeof SUPER_ADMIN_OPERATOR_EMAILS)[number]

export function isSuperAdminOperatorEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return (SUPER_ADMIN_OPERATOR_EMAILS as readonly string[]).includes(normalized)
}
