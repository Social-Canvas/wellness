"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { updateMemberRoleAction } from "@/features/members/actions/members.actions"
import type { MemberListItem } from "@/features/members/types"
import type { UserRole } from "@/features/auth/types"
import { productSelectClassName } from "@/features/shop/components/product-form-styles"
import { cn } from "@/lib/utils"

import { formatMemberRoleLabel } from "./member-role-badge"

const ROLE_OPTIONS: UserRole[] = ["user", "admin", "super_admin"]

type MemberRoleSelectProps = {
  member: MemberListItem
  currentProfileId: string
}

export function MemberRoleSelect({ member, currentProfileId }: MemberRoleSelectProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const isSelf = member.id === currentProfileId

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextRole = event.target.value as UserRole

    if (nextRole === member.role) {
      return
    }

    setError(null)
    setIsUpdating(true)

    const result = await updateMemberRoleAction(member.id, nextRole)

    setIsUpdating(false)

    if (!result.success) {
      setError(result.error.message)
      event.target.value = member.role
      return
    }

    router.refresh()
  }

  if (isSelf) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{formatMemberRoleLabel(member.role)}</p>
        <p className="text-xs text-ink-soft">You cannot change your own role.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <select
        aria-label={`Change role for ${member.email}`}
        className={cn(productSelectClassName, "max-w-[180px]")}
        value={member.role}
        disabled={isUpdating}
        onChange={handleChange}
      >
        {ROLE_OPTIONS.map((role) => (
          <option key={role} value={role}>
            {formatMemberRoleLabel(role)}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
