"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type { UserRole } from "@/features/auth/types"
import { updateMemberRole } from "@/features/members/services/members.service"
import type { MemberListItem } from "@/features/members/types"

export async function updateMemberRoleAction(
  profileId: string,
  role: UserRole
): Promise<ActionResult<MemberListItem>> {
  const result = await updateMemberRole(profileId, role)

  if (result.success) {
    revalidatePath("/admin/members")
  }

  return result
}
