import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentUser } from "@/features/auth/services/auth.service"
import type { AuthSessionUser, UserRole } from "@/features/auth/types"
import { updateMemberRoleSchema } from "@/features/members/schemas/update-member-role"
import type { MemberListItem } from "@/features/members/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger, safeErrorMessage } from "@/server/utils/logger"
import type { Database } from "@/types/database/supabase"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type MemberProfileRow = Pick<
  ProfileRow,
  "id" | "full_name" | "email" | "role" | "created_at"
>

const ADMIN_ROLES = new Set<UserRole>(["admin", "super_admin"])

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function validationFailure(message: string): ActionResult<never> {
  return failure("validation_error", message)
}

function firstValidationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

function mapMember(row: MemberProfileRow): MemberListItem {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  }
}

async function requireAdminActor(): Promise<ActionResult<AuthSessionUser>> {
  const actorResult = await getCurrentUser()

  if (!actorResult.success) {
    return actorResult
  }

  if (!ADMIN_ROLES.has(actorResult.data.role)) {
    return failure("forbidden", "You do not have permission to manage members.")
  }

  return actorResult
}

async function requireSuperAdminActor(): Promise<ActionResult<AuthSessionUser>> {
  const actorResult = await getCurrentUser()

  if (!actorResult.success) {
    return actorResult
  }

  if (actorResult.data.role !== "super_admin") {
    return failure("forbidden", "Only super admins can change member roles.")
  }

  return actorResult
}

export async function listMembers(): Promise<ActionResult<MemberListItem[]>> {
  const actorResult = await requireAdminActor()

  if (!actorResult.success) {
    return actorResult
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      logger.error("[members] listMembers failed", {
        operation: "listMembers",
        code: error.code,
        message: error.message,
      })
      return failure("provider_error", "Unable to load members. Please try again.")
    }

    return success((data ?? []).map(mapMember))
  } catch (caughtError) {
    logger.error("[members] listMembers unexpected error", {
      operation: "listMembers",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updateMemberRole(
  profileId: string,
  role: UserRole
): Promise<ActionResult<MemberListItem>> {
  const parsed = updateMemberRoleSchema.safeParse({ profileId, role })

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  const actorResult = await requireSuperAdminActor()

  if (!actorResult.success) {
    return actorResult
  }

  if (actorResult.data.id === parsed.data.profileId) {
    return failure("forbidden", "You cannot change your own role.")
  }

  try {
    const supabase = createAdminClient()
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("id", parsed.data.profileId)
      .maybeSingle()

    if (fetchError) {
      logger.error("[members] updateMemberRole fetch failed", {
        operation: "updateMemberRole",
        code: fetchError.code,
        message: fetchError.message,
        profileId: parsed.data.profileId,
      })
      return failure("provider_error", "Unable to update member role. Please try again.")
    }

    if (!existingProfile) {
      return failure("not_found", "Member not found.")
    }

    if (existingProfile.role === parsed.data.role) {
      return success(mapMember(existingProfile))
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ role: parsed.data.role })
      .eq("id", parsed.data.profileId)
      .select("id, full_name, email, role, created_at")
      .single()

    if (updateError) {
      logger.error("[members] updateMemberRole update failed", {
        operation: "updateMemberRole",
        code: updateError.code,
        message: updateError.message,
        profileId: parsed.data.profileId,
      })
      return failure("provider_error", "Unable to update member role. Please try again.")
    }

    if (!updatedProfile) {
      return failure("not_found", "Member not found.")
    }

    logger.info("[audit] member role updated", {
      actorProfileId: actorResult.data.id,
      actorEmail: actorResult.data.email,
      targetProfileId: updatedProfile.id,
      targetEmail: updatedProfile.email,
      previousRole: existingProfile.role,
      newRole: updatedProfile.role,
    })

    return success(mapMember(updatedProfile))
  } catch (caughtError) {
    logger.error("[members] updateMemberRole unexpected error", {
      operation: "updateMemberRole",
      error: safeErrorMessage(caughtError),
      profileId: parsed.data.profileId,
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
