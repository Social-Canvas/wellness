import type { UserRole } from "@/features/auth/types"

export type MemberListItem = {
  id: string
  fullName: string | null
  email: string
  role: UserRole
  createdAt: string
}
