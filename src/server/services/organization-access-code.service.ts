import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  generateOrganizationAccessCode,
  hashOrganizationAccessCode,
  mapRedeemRpcError,
  normalizeOrganizationAccessCode,
  organizationAccessCodePrefix,
  redemptionFailureMessage,
  type OrganizationAccessRedemptionErrorCode,
} from "@/features/organizations/utils/access-codes"
import {
  clearRedemptionFailures,
  isRedemptionRateLimited,
  recordRedemptionFailure,
} from "@/features/organizations/utils/redemption-rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger } from "@/server/utils/logger"
import { recordMembershipLifecycleEvent } from "@/server/services/membership.service"

type ActionFailure = Extract<ActionResult<never>, { success: false }>

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function orgDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

const uuidSchema = z.uuid()
const emailSchema = z.email()

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

async function assertOrgAdministrator(input: {
  organizationId: string
  profileId: string
}): Promise<ActionResult<{ role: string }>> {
  const supabase = orgDb()
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, role, status")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.profileId)
    .eq("status", "active")
    .in("role", ["owner", "administrator"])
    .maybeSingle()

  if (error || !data) {
    return failure("forbidden", "Not authorized to manage this organization.")
  }

  return success({ role: (data as { role: string }).role })
}

export async function createOrRotateOrganizationAccessCode(input: {
  organizationId: string
  actorProfileId: string
  /** Platform admin bypasses org-admin membership check. */
  asPlatformAdmin?: boolean
  expiresAt?: string | null
  allowedEmailDomain?: string | null
  redemptionInstructions?: string | null
}): Promise<
  ActionResult<{
    codeId: string
    displayCode: string
    codePrefix: string
    expiresAt: string | null
  }>
> {
  const organizationId = uuidSchema.safeParse(input.organizationId)
  const actorProfileId = uuidSchema.safeParse(input.actorProfileId)

  if (!organizationId.success || !actorProfileId.success) {
    return failure("validation_error", "Invalid organization or actor.")
  }

  if (!input.asPlatformAdmin) {
    const admin = await assertOrgAdministrator({
      organizationId: organizationId.data,
      profileId: actorProfileId.data,
    })
    if (!admin.success) {
      return admin as ActionFailure
    }
  }

  const supabase = orgDb()
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, status, name")
    .eq("id", organizationId.data)
    .maybeSingle()

  if (orgError || !organization) {
    return failure("not_found", "Organization not found.")
  }

  const displayCode = generateOrganizationAccessCode()
  const codeHash = hashOrganizationAccessCode(displayCode)
  const codePrefix = organizationAccessCodePrefix(displayCode)
  const now = new Date().toISOString()

  // Invalidate previous active code without removing members.
  const { error: rotateError } = await supabase
    .from("organization_access_codes")
    .update({
      status: "rotated",
      revoked_at: now,
      last_rotated_at: now,
    })
    .eq("organization_id", organizationId.data)
    .eq("status", "active")

  if (rotateError) {
    logger.error("[org-access-code] Failed to rotate prior code", {
      organizationId: organizationId.data,
      code: rotateError.code,
    })
    return failure("provider_error", "Unable to rotate the previous access code.")
  }

  const { data, error } = await supabase
    .from("organization_access_codes")
    .insert({
      organization_id: organizationId.data,
      code_hash: codeHash,
      code_prefix: codePrefix,
      status: "active",
      created_by: actorProfileId.data,
      expires_at: input.expiresAt ?? null,
      last_rotated_at: now,
      allowed_email_domain: input.allowedEmailDomain?.trim().toLowerCase() || null,
      redemption_instructions: input.redemptionInstructions?.trim() || null,
    })
    .select("id, expires_at")
    .single()

  if (error || !data) {
    logger.error("[org-access-code] Failed to create code", {
      organizationId: organizationId.data,
      code: error?.code,
    })
    return failure("provider_error", "Unable to create organization access code.")
  }

  const row = data as { id: string; expires_at: string | null }

  await recordMembershipLifecycleEvent({
    eventType: "organization_access_code_created",
    sourceEventId: `org_access_code:${row.id}`,
    organizationId: organizationId.data,
    userId: actorProfileId.data,
    metadata: {
      codePrefix,
      // Never include the full redeemable code in event payloads.
    },
  })

  return success({
    codeId: row.id,
    displayCode,
    codePrefix,
    expiresAt: row.expires_at,
  })
}

export async function revokeOrganizationAccessCode(input: {
  organizationId: string
  actorProfileId: string
  asPlatformAdmin?: boolean
}): Promise<ActionResult<{ revoked: boolean }>> {
  const organizationId = uuidSchema.safeParse(input.organizationId)
  const actorProfileId = uuidSchema.safeParse(input.actorProfileId)

  if (!organizationId.success || !actorProfileId.success) {
    return failure("validation_error", "Invalid organization or actor.")
  }

  if (!input.asPlatformAdmin) {
    const admin = await assertOrgAdministrator({
      organizationId: organizationId.data,
      profileId: actorProfileId.data,
    })
    if (!admin.success) {
      return admin as ActionFailure
    }
  }

  const supabase = orgDb()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("organization_access_codes")
    .update({
      status: "revoked",
      revoked_at: now,
    })
    .eq("organization_id", organizationId.data)
    .eq("status", "active")
    .select("id")

  if (error) {
    return failure("provider_error", "Unable to revoke access code.")
  }

  return success({ revoked: (data ?? []).length > 0 })
}

export type RedeemOrganizationAccessCodeResult = {
  organizationId: string
  organizationName: string
  memberId: string
  memberStatus: string
  destinationPath: string
}

export async function redeemOrganizationAccessCode(input: {
  code: string
  profileId: string
  email: string
}): Promise<ActionResult<RedeemOrganizationAccessCodeResult>> {
  const profileId = uuidSchema.safeParse(input.profileId)
  const email = emailSchema.safeParse(input.email.trim().toLowerCase())

  if (!profileId.success) {
    return failure("validation_error", redemptionFailureMessage("invalid_user"))
  }
  if (!email.success) {
    return failure("validation_error", redemptionFailureMessage("invalid_user"))
  }

  if (isRedemptionRateLimited(profileId.data)) {
    return failure("rate_limited", redemptionFailureMessage("rate_limited"))
  }

  const normalized = normalizeOrganizationAccessCode(input.code)
  if (normalized.length < 12) {
    recordRedemptionFailure(profileId.data)
    await recordAttempt({
      profileId: profileId.data,
      success: false,
      failureReason: "invalid_code",
      codePrefix: null,
    })
    return failure("invalid_code", redemptionFailureMessage("invalid_code"))
  }

  const codeHash = hashOrganizationAccessCode(normalized)
  const codePrefix = organizationAccessCodePrefix(normalized)
  const supabase = orgDb()

  const { data, error } = await supabase.rpc("redeem_organization_access_code", {
    p_code_hash: codeHash,
    p_profile_id: profileId.data,
    p_email: email.data,
  })

  if (error) {
    logger.error("[org-access-code] Redeem RPC failed", {
      code: error.code,
      // Do not log hash or full code.
    })
    recordRedemptionFailure(profileId.data)
    await recordAttempt({
      profileId: profileId.data,
      success: false,
      failureReason: "provider_error",
      codePrefix,
    })
    return failure("provider_error", redemptionFailureMessage("invalid_code"))
  }

  const payload = data as {
    ok?: boolean
    error?: string
    organization_id?: string
    organization_name?: string
    member_id?: string
    member_status?: string
    plan_id?: string
    direct_activation?: boolean
  } | null

  if (!payload?.ok) {
    const mapped = mapRedeemRpcError(payload?.error)
    recordRedemptionFailure(profileId.data)
    await recordAttempt({
      profileId: profileId.data,
      success: false,
      failureReason: mapped,
      codePrefix,
    })
    return failure(mapped, redemptionFailureMessage(mapped))
  }

  clearRedemptionFailures(profileId.data)
  await recordAttempt({
    profileId: profileId.data,
    success: true,
    failureReason: null,
    codePrefix,
  })

  if (payload.member_status === "active") {
    await recordMembershipLifecycleEvent({
      eventType: "organization_sponsored_access_activated",
      sourceEventId: `org_redeem:${payload.member_id}`,
      userId: profileId.data,
      organizationId: payload.organization_id ?? null,
      planId: payload.plan_id ?? null,
      metadata: {
        codePrefix,
        memberStatus: payload.member_status ?? "active",
      },
    })
  } else {
    await recordMembershipLifecycleEvent({
      eventType: "organization_member_invited",
      sourceEventId: `org_redeem_pending:${payload.member_id}`,
      userId: profileId.data,
      organizationId: payload.organization_id ?? null,
      planId: payload.plan_id ?? null,
      metadata: {
        codePrefix,
        memberStatus: payload.member_status ?? "invited",
        awaitingApproval: true,
      },
    })
  }

  // Best-effort seat limit event (does not affect redemption success).
  if (payload.organization_id) {
    void maybeRecordSeatLimitReached(payload.organization_id)
  }

  return success({
    organizationId: payload.organization_id!,
    organizationName: payload.organization_name ?? "your organization",
    memberId: payload.member_id!,
    memberStatus: payload.member_status ?? "active",
    destinationPath: "/dashboard/membership",
  })
}

async function recordAttempt(input: {
  profileId: string
  success: boolean
  failureReason: string | null
  codePrefix: string | null
}): Promise<void> {
  try {
    const supabase = orgDb()
    await supabase.from("organization_access_code_attempts").insert({
      profile_id: input.profileId,
      success: input.success,
      failure_reason: input.failureReason,
      code_prefix: input.codePrefix,
    })
  } catch {
    // Attempt logging must never block or corrupt redemption state.
  }
}

async function maybeRecordSeatLimitReached(organizationId: string): Promise<void> {
  try {
    const supabase = orgDb()
    const { data: org } = await supabase
      .from("organizations")
      .select("seat_limit")
      .eq("id", organizationId)
      .maybeSingle()
    const seatLimit = (org as { seat_limit?: number } | null)?.seat_limit ?? 0
    if (seatLimit <= 0) {
      return
    }
    const { data: occupied } = await supabase.rpc(
      "count_occupied_organization_seats",
      { p_organization_id: organizationId }
    )
    if (typeof occupied === "number" && occupied >= seatLimit) {
      await recordMembershipLifecycleEvent({
        eventType: "organization_seat_limit_reached",
        sourceEventId: `org_seat_limit:${organizationId}:${seatLimit}:${occupied}`,
        organizationId,
        metadata: { seatLimit, occupied },
      })
    }
  } catch {
    // Non-blocking.
  }
}

export async function getOrganizationAccessCodeMetadata(
  organizationId: string
): Promise<
  ActionResult<{
    id: string
    codePrefix: string
    status: string
    expiresAt: string | null
    createdAt: string
    lastRotatedAt: string | null
  } | null>
> {
  const parsed = uuidSchema.safeParse(organizationId)
  if (!parsed.success) {
    return failure("validation_error", firstIssue(parsed.error))
  }

  const supabase = orgDb()
  const { data, error } = await supabase
    .from("organization_access_codes")
    .select("id, code_prefix, status, expires_at, created_at, last_rotated_at")
    .eq("organization_id", parsed.data)
    .eq("status", "active")
    .maybeSingle()

  if (error) {
    return failure("provider_error", "Unable to load access code metadata.")
  }

  if (!data) {
    return success(null)
  }

  const row = data as {
    id: string
    code_prefix: string
    status: string
    expires_at: string | null
    created_at: string
    last_rotated_at: string | null
  }

  return success({
    id: row.id,
    codePrefix: row.code_prefix,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    lastRotatedAt: row.last_rotated_at,
  })
}

export function publicRedemptionError(
  code: OrganizationAccessRedemptionErrorCode
): string {
  return redemptionFailureMessage(code)
}
