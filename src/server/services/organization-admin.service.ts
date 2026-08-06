import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordMembershipLifecycleEvent } from "@/server/services/membership.service"
import { SPONSORED_CONTENT_PLAN_SLUG } from "@/features/organizations/utils/access-codes"

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

/**
 * Platform-admin workflow: create or update an approved nonprofit organization.
 * Enquiry submission never activates access — this is an explicit admin step.
 */
export async function upsertNonprofitOrganization(input: {
  organizationId?: string | null
  name: string
  seatLimit: number
  status:
    | "pending"
    | "approved"
    | "active"
    | "suspended"
    | "expired"
    | "cancelled"
  billingStatus:
    | "unpaid"
    | "invoiced"
    | "paid"
    | "manual_contract"
    | "stripe_subscription"
    | "past_due"
    | "cancelled"
  accessStartAt?: string | null
  accessEndAt?: string | null
  directActivation?: boolean
  approvedEmailDomains?: string[]
  actorProfileId: string
}): Promise<ActionResult<{ id: string }>> {
  const name = input.name.trim()
  if (!name) {
    return failure("validation_error", "Organization name is required.")
  }
  if (input.seatLimit < 0) {
    return failure("validation_error", "Seat limit cannot be negative.")
  }

  const supabase = orgDb()
  const { data: platinum } = await supabase
    .from("plans")
    .select("id")
    .eq("slug", SPONSORED_CONTENT_PLAN_SLUG)
    .maybeSingle()

  const platinumId = (platinum as { id: string } | null)?.id ?? null
  if (!platinumId) {
    return failure("provider_error", "Platinum plan is not configured.")
  }

  const payload = {
    name,
    organization_type: "nonprofit",
    access_model: "sponsored",
    plan_id: platinumId,
    seat_limit: input.seatLimit,
    status: input.status,
    billing_status: input.billingStatus,
    access_start_at: input.accessStartAt ?? null,
    access_end_at: input.accessEndAt ?? null,
    direct_activation: input.directActivation ?? true,
    approved_email_domains: input.approvedEmailDomains ?? [],
  }

  if (input.organizationId) {
    const organizationId = uuidSchema.safeParse(input.organizationId)
    if (!organizationId.success) {
      return failure("validation_error", "Invalid organization id.")
    }

    const { data, error } = await supabase
      .from("organizations")
      .update(payload)
      .eq("id", organizationId.data)
      .select("id")
      .maybeSingle()

    if (error || !data) {
      return failure("provider_error", "Unable to update organization.")
    }

    return success({ id: (data as { id: string }).id })
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert(payload)
    .select("id")
    .single()

  if (error || !data) {
    return failure("provider_error", "Unable to create organization.")
  }

  const id = (data as { id: string }).id

  if (input.status === "approved" || input.status === "active") {
    await recordMembershipLifecycleEvent({
      eventType: "organization_approved",
      sourceEventId: `org_approved:${id}`,
      organizationId: id,
      userId: input.actorProfileId,
      planId: platinumId,
      metadata: {
        seatLimit: input.seatLimit,
        billingStatus: input.billingStatus,
      },
    })
  }

  return success({ id })
}

export async function assignOrganizationAdministrator(input: {
  organizationId: string
  email: string
  actorProfileId: string
}): Promise<ActionResult<{ memberId: string }>> {
  const organizationId = uuidSchema.safeParse(input.organizationId)
  const email = z.email().safeParse(input.email.trim().toLowerCase())
  if (!organizationId.success || !email.success) {
    return failure("validation_error", "Invalid organization or email.")
  }

  const supabase = orgDb()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.data)
    .maybeSingle()

  const profileId = (profile as { id: string } | null)?.id ?? null

  const { data, error } = await supabase
    .from("organization_members")
    .upsert(
      {
        organization_id: organizationId.data,
        email: email.data,
        user_id: profileId,
        role: "administrator",
        status: profileId ? "active" : "invited",
        activated_at: profileId ? new Date().toISOString() : null,
      },
      { onConflict: "organization_id,email" }
    )
    .select("id")
    .single()

  if (error || !data) {
    return failure("provider_error", "Unable to assign organization administrator.")
  }

  const memberId = (data as { id: string }).id

  await recordMembershipLifecycleEvent({
    eventType: "organization_administrator_invited",
    sourceEventId: `org_admin_invite:${memberId}`,
    organizationId: organizationId.data,
    userId: profileId,
    metadata: { email: email.data },
  })

  return success({ memberId })
}
