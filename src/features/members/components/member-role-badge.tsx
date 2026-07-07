import { Badge } from "@/components/ui"
import type { UserRole } from "@/features/auth/types"

const ROLE_LABELS: Record<UserRole, string> = {
  user: "User",
  admin: "Admin",
  super_admin: "Super admin",
}

function roleBadgeVariant(role: UserRole): "outline" | "plan" | "default" {
  if (role === "super_admin") {
    return "default"
  }

  if (role === "admin") {
    return "plan"
  }

  return "outline"
}

type MemberRoleBadgeProps = {
  role: UserRole
}

export function MemberRoleBadge({ role }: MemberRoleBadgeProps) {
  return <Badge variant={roleBadgeVariant(role)}>{ROLE_LABELS[role]}</Badge>
}

export function formatMemberRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role]
}
