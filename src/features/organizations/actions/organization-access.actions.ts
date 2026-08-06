"use server"

import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/auth/services/auth.service"
import {
  redeemOrganizationAccessSchema,
  type RedeemOrganizationAccessInput,
} from "@/features/organizations/schemas/redeem-organization-access"
import {
  createOrRotateOrganizationAccessCode,
  redeemOrganizationAccessCode,
  revokeOrganizationAccessCode,
  type RedeemOrganizationAccessCodeResult,
} from "@/server/services/organization-access-code.service"
import {
  removeOrganizationMember,
  suspendOrganizationMember,
} from "@/server/services/membership.service"
import { createAdminClient } from "@/lib/supabase/admin"

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function membershipDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

async function assertCanManageOrganization(input: {
  organizationId: string
  profileId: string
  isPlatformAdmin: boolean
}): Promise<ActionResult<{ ok: true }>> {
  if (input.isPlatformAdmin) {
    return { success: true, data: { ok: true } }
  }

  const supabase = membershipDb()
  const { data: adminRow } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.profileId)
    .eq("status", "active")
    .in("role", ["owner", "administrator"])
    .maybeSingle()

  if (!adminRow) {
    return failure("forbidden", "Not authorized to manage this organization.")
  }

  return { success: true, data: { ok: true } }
}

/**
 * Redeem using the authenticated user only — browser cannot supply org/plan/capabilities.
 */
export async function redeemOrganizationAccessAction(
  input: RedeemOrganizationAccessInput
): Promise<ActionResult<RedeemOrganizationAccessCodeResult>> {
  const parsed = redeemOrganizationAccessSchema.safeParse(input)
  if (!parsed.success) {
    return failure(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Enter a valid access code."
    )
  }

  const [userResult, profileResult] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ])

  if (!userResult.success || !profileResult.success) {
    return failure("unauthenticated", "Sign in to activate sponsored access.")
  }

  const email = userResult.data.email
  if (!email) {
    return failure("invalid_user", "Unable to redeem this code for your account.")
  }

  const result = await redeemOrganizationAccessCode({
    code: parsed.data.code,
    profileId: profileResult.data.id,
    email,
  })

  if (result.success) {
    revalidatePath("/dashboard/membership")
    revalidatePath("/dashboard")
    revalidatePath("/redeem-organization-access")
  }

  return result
}

export async function generateOrganizationAccessCodeAction(input: {
  organizationId: string
}): Promise<
  ActionResult<{
    displayCode: string
    codePrefix: string
    expiresAt: string | null
  }>
> {
  const organizationId = z.uuid().safeParse(input.organizationId)
  if (!organizationId.success) {
    return failure("validation_error", "Invalid organization.")
  }

  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    return failure("unauthenticated", "Sign in required.")
  }

  const isPlatformAdmin =
    profileResult.data.role === "admin" ||
    profileResult.data.role === "super_admin"

  const result = await createOrRotateOrganizationAccessCode({
    organizationId: organizationId.data,
    actorProfileId: profileResult.data.id,
    asPlatformAdmin: isPlatformAdmin,
  })

  if (result.success) {
    revalidatePath("/dashboard/nonprofit")
    revalidatePath("/dashboard/organization")
  }

  return result
}

export async function revokeOrganizationAccessCodeAction(input: {
  organizationId: string
}): Promise<ActionResult<{ revoked: boolean }>> {
  const organizationId = z.uuid().safeParse(input.organizationId)
  if (!organizationId.success) {
    return failure("validation_error", "Invalid organization.")
  }

  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    return failure("unauthenticated", "Sign in required.")
  }

  const isPlatformAdmin =
    profileResult.data.role === "admin" ||
    profileResult.data.role === "super_admin"

  const result = await revokeOrganizationAccessCode({
    organizationId: organizationId.data,
    actorProfileId: profileResult.data.id,
    asPlatformAdmin: isPlatformAdmin,
  })

  if (result.success) {
    revalidatePath("/dashboard/nonprofit")
    revalidatePath("/dashboard/organization")
  }

  return result
}

export async function suspendOrganizationMemberAction(input: {
  organizationId: string
  memberId: string
}): Promise<ActionResult<{ suspended: boolean }>> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    return failure("unauthenticated", "Sign in required.")
  }

  const isPlatformAdmin =
    profileResult.data.role === "admin" ||
    profileResult.data.role === "super_admin"

  const authz = await assertCanManageOrganization({
    organizationId: input.organizationId,
    profileId: profileResult.data.id,
    isPlatformAdmin,
  })
  if (!authz.success) {
    return authz
  }

  const result = await suspendOrganizationMember(input)
  if (result.success) {
    revalidatePath("/dashboard/nonprofit")
    revalidatePath("/dashboard/organization")
  }
  return result
}

export async function removeOrganizationMemberAction(input: {
  organizationId: string
  memberId: string
}): Promise<ActionResult<{ released: boolean }>> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    return failure("unauthenticated", "Sign in required.")
  }

  const isPlatformAdmin =
    profileResult.data.role === "admin" ||
    profileResult.data.role === "super_admin"

  const authz = await assertCanManageOrganization({
    organizationId: input.organizationId,
    profileId: profileResult.data.id,
    isPlatformAdmin,
  })
  if (!authz.success) {
    return authz
  }

  const result = await removeOrganizationMember(input)
  if (result.success) {
    revalidatePath("/dashboard/nonprofit")
    revalidatePath("/dashboard/organization")
  }
  return result
}
