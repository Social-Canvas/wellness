import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { cache } from "react"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  COMP_PREVIEW_MARKER_PREFIX,
  isActiveSubscription,
} from "@/server/services/preview-eligibility"
import {
  DEFAULT_CAPABILITIES_BY_PLAN_SLUG,
  MEMBERSHIP_CAPABILITIES,
  type MembershipCapability,
  defaultCapabilitiesForPlanSlug,
} from "@/server/services/membership-capabilities"

export {
  MEMBERSHIP_CAPABILITIES,
  defaultCapabilitiesForPlanSlug,
  type MembershipCapability,
}

export type MembershipAccessSource =
  | "personal_stripe"
  | "nonprofit_sponsored"
  | "complimentary"
  | "none"

export type NormalizedMembershipStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "cancel_at_period_end"
  | "cancelled"
  | "paused"
  | "suspended"
  | "none"

export type EffectiveMembership = {
  userId: string
  effectiveTierSlug: string | null
  effectivePlanId: string | null
  effectivePlanName: string | null
  source: MembershipAccessSource
  status: NormalizedMembershipStatus
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  scheduledPlanId: string | null
  scheduledPlanName: string | null
  capabilities: MembershipCapability[]
  hasCourseLibrary: boolean
  canAttendInPerson: boolean
  isSponsored: boolean
  organizationId: string | null
  organizationName: string | null
  upgradePlanSlugs: string[]
  downgradePlanSlugs: string[]
  hasPersonalBilling: boolean
}

type ActionFailure = Extract<ActionResult<never>, { success: false }>

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function membershipDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

const userIdSchema = z.uuid("Invalid user id.")
const organizationIdSchema = z.uuid("Invalid organization id.")
const emailSchema = z.email("Invalid email.")

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

function asCapability(value: string): MembershipCapability | null {
  return (MEMBERSHIP_CAPABILITIES as readonly string[]).includes(value)
    ? (value as MembershipCapability)
    : null
}

function normalizePersonalStatus(input: {
  status: string
  cancelAtPeriodEnd: boolean
}): NormalizedMembershipStatus {
  if (input.cancelAtPeriodEnd && (input.status === "active" || input.status === "trialing")) {
    return "cancel_at_period_end"
  }

  switch (input.status) {
    case "active":
      return "active"
    case "trialing":
      return "trialing"
    case "past_due":
      return "past_due"
    case "paused":
      return "paused"
    case "incomplete":
    case "incomplete_expired":
      return "incomplete"
    case "canceled":
    case "unpaid":
      return "cancelled"
    default:
      return "none"
  }
}

const PLAN_RANK: Record<string, number> = {
  "plan-1": 1,
  "plan-2": 2,
  "plan-3": 3,
}

const DEFAULT_CAPABILITIES = DEFAULT_CAPABILITIES_BY_PLAN_SLUG

async function loadCapabilitiesForPlan(
  planId: string,
  planSlug?: string | null
): Promise<MembershipCapability[]> {
  const supabase = membershipDb()
  const { data, error } = await supabase
    .from("plan_capabilities")
    .select("capability_key")
    .eq("plan_id", planId)

  if (!error && data && data.length > 0) {
    const keys: MembershipCapability[] = []
    for (const row of data as Array<{ capability_key: string }>) {
      const capability = asCapability(row.capability_key)
      if (capability) {
        keys.push(capability)
      }
    }
    if (keys.length > 0) {
      return keys
    }
  }

  return DEFAULT_CAPABILITIES[planSlug ?? "plan-1"] ?? DEFAULT_CAPABILITIES["plan-1"]
}

/**
 * Records an idempotent membership lifecycle event for email automation.
 * Does not send external email.
 */
export async function recordMembershipLifecycleEvent(input: {
  eventType: string
  sourceEventId: string
  userId?: string | null
  organizationId?: string | null
  planId?: string | null
  effectiveAt?: string
  metadata?: Record<string, string | number | boolean | null>
}): Promise<ActionResult<{ created: boolean }>> {
  const supabase = membershipDb()

  const { error } = await supabase.from("membership_lifecycle_events").insert({
    event_type: input.eventType,
    source_event_id: input.sourceEventId,
    user_id: input.userId ?? null,
    organization_id: input.organizationId ?? null,
    plan_id: input.planId ?? null,
    effective_at: input.effectiveAt ?? new Date().toISOString(),
    status: "pending",
    metadata: input.metadata ?? {},
  })

  if (error?.code === "23505") {
    return success({ created: false })
  }

  if (error) {
    return failure("provider_error", "Unable to record membership lifecycle event.")
  }

  return success({ created: true })
}

export const getEffectiveMembership = cache(
  async (userId: string): Promise<ActionResult<EffectiveMembership>> => {
    const parsed = userIdSchema.safeParse(userId)
    if (!parsed.success) {
      return failure("validation_error", firstIssue(parsed.error))
    }

    const empty: EffectiveMembership = {
      userId: parsed.data,
      effectiveTierSlug: null,
      effectivePlanId: null,
      effectivePlanName: null,
      source: "none",
      status: "none",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      scheduledPlanId: null,
      scheduledPlanName: null,
      capabilities: [],
      hasCourseLibrary: false,
      canAttendInPerson: false,
      isSponsored: false,
      organizationId: null,
      organizationName: null,
      upgradePlanSlugs: [],
      downgradePlanSlugs: [],
      hasPersonalBilling: false,
    }

    try {
      const supabase = membershipDb()

      const [{ data: subscriptions }, { data: sponsored }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select(
            "id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id, scheduled_plan_id, access_source, plans ( id, name, slug )"
          )
          .eq("user_id", parsed.data)
          .order("created_at", { ascending: false }),
        supabase
          .from("organization_members")
          .select(
            "id, status, assigned_plan_id, organization_id, organizations ( id, name, status, plan_id, plans ( id, name, slug ) )"
          )
          .eq("user_id", parsed.data)
          .eq("status", "active"),
      ])

      type SubRow = {
        plan_id: string
        status: string
        current_period_start: string | null
        current_period_end: string | null
        cancel_at_period_end: boolean
        stripe_subscription_id: string
        scheduled_plan_id?: string | null
        access_source?: string | null
        plans: { id: string; name: string; slug: string } | null
      }

      const personalRows = (subscriptions ?? []) as unknown as SubRow[]
      const activePersonal = personalRows.find((row) =>
        isActiveSubscription({
          status: row.status,
          current_period_end: row.current_period_end,
          cancel_at_period_end: row.cancel_at_period_end,
        })
      )

      type SponsoredRow = {
        status: string
        assigned_plan_id: string | null
        organization_id: string
        organizations: {
          id: string
          name: string
          status: string
          plan_id: string | null
          plans: { id: string; name: string; slug: string } | null
        } | null
      }

      const sponsoredRows = (sponsored ?? []) as unknown as SponsoredRow[]
      const activeSponsored = sponsoredRows.find(
        (row) =>
          row.status === "active" &&
          row.organizations?.status === "active" &&
          Boolean(row.assigned_plan_id || row.organizations.plan_id)
      )

      type Candidate = {
        source: MembershipAccessSource
        planId: string
        planName: string
        planSlug: string
        status: NormalizedMembershipStatus
        currentPeriodStart: string | null
        currentPeriodEnd: string | null
        cancelAtPeriodEnd: boolean
        scheduledPlanId: string | null
        organizationId: string | null
        organizationName: string | null
        hasPersonalBilling: boolean
      }

      const candidates: Candidate[] = []

      if (activePersonal) {
        const isComp = activePersonal.stripe_subscription_id.startsWith(
          COMP_PREVIEW_MARKER_PREFIX
        )
        candidates.push({
          source: isComp ? "complimentary" : "personal_stripe",
          planId: activePersonal.plan_id,
          planName: activePersonal.plans?.name ?? "Membership",
          planSlug: activePersonal.plans?.slug ?? "plan-1",
          status: normalizePersonalStatus({
            status: activePersonal.status,
            cancelAtPeriodEnd: activePersonal.cancel_at_period_end,
          }),
          currentPeriodStart: activePersonal.current_period_start,
          currentPeriodEnd: activePersonal.current_period_end,
          cancelAtPeriodEnd: activePersonal.cancel_at_period_end,
          scheduledPlanId: activePersonal.scheduled_plan_id ?? null,
          organizationId: null,
          organizationName: null,
          hasPersonalBilling: !isComp,
        })
      }

      if (activeSponsored?.organizations) {
        const orgPlan = activeSponsored.organizations.plans
        const planId =
          activeSponsored.assigned_plan_id ??
          activeSponsored.organizations.plan_id ??
          orgPlan?.id
        if (planId) {
          let planName = orgPlan?.name ?? "Sponsored membership"
          let planSlug = orgPlan?.slug ?? "plan-1"

          if (
            activeSponsored.assigned_plan_id &&
            activeSponsored.assigned_plan_id !== orgPlan?.id
          ) {
            const { data: assignedPlan } = await supabase
              .from("plans")
              .select("id, name, slug")
              .eq("id", activeSponsored.assigned_plan_id)
              .maybeSingle()
            const assigned = assignedPlan as {
              id: string
              name: string
              slug: string
            } | null
            if (assigned) {
              planName = assigned.name
              planSlug = assigned.slug
            }
          }

          candidates.push({
            source: "nonprofit_sponsored",
            planId,
            planName,
            planSlug,
            status: "active",
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            scheduledPlanId: null,
            organizationId: activeSponsored.organizations.id,
            organizationName: activeSponsored.organizations.name,
            hasPersonalBilling: false,
          })
        }
      }

      if (candidates.length === 0) {
        return success(empty)
      }

      candidates.sort(
        (a, b) => (PLAN_RANK[b.planSlug] ?? 0) - (PLAN_RANK[a.planSlug] ?? 0)
      )
      const selected = candidates[0]
      const hasPersonalBilling = candidates.some(
        (candidate) => candidate.hasPersonalBilling
      )

      const capabilitySets = await Promise.all(
        candidates.map((candidate) =>
          loadCapabilitiesForPlan(candidate.planId, candidate.planSlug)
        )
      )
      const capabilityUnion = new Set<MembershipCapability>()
      for (const set of capabilitySets) {
        for (const key of set) {
          capabilityUnion.add(key)
        }
      }
      const capabilities = [...capabilityUnion]

      let scheduledPlanName: string | null = null
      if (selected.scheduledPlanId) {
        const { data: scheduledPlan } = await supabase
          .from("plans")
          .select("name")
          .eq("id", selected.scheduledPlanId)
          .maybeSingle()
        scheduledPlanName =
          (scheduledPlan as { name?: string } | null)?.name ?? null
      }

      const rank = PLAN_RANK[selected.planSlug] ?? 1
      const upgradePlanSlugs = Object.entries(PLAN_RANK)
        .filter(([, value]) => value > rank)
        .map(([slug]) => slug)
      const downgradePlanSlugs = Object.entries(PLAN_RANK)
        .filter(([, value]) => value < rank)
        .map(([slug]) => slug)

      return success({
        userId: parsed.data,
        effectiveTierSlug: selected.planSlug,
        effectivePlanId: selected.planId,
        effectivePlanName: selected.planName,
        source: selected.source,
        status: selected.status,
        currentPeriodStart: selected.currentPeriodStart,
        currentPeriodEnd: selected.currentPeriodEnd,
        cancelAtPeriodEnd: selected.cancelAtPeriodEnd,
        scheduledPlanId: selected.scheduledPlanId,
        scheduledPlanName,
        capabilities,
        hasCourseLibrary: capabilities.includes("membership_course_library"),
        canAttendInPerson: capabilities.includes("in_person_sessions"),
        isSponsored: selected.source === "nonprofit_sponsored",
        organizationId: selected.organizationId,
        organizationName: selected.organizationName,
        upgradePlanSlugs,
        downgradePlanSlugs,
        hasPersonalBilling,
      })
    } catch {
      return failure("unknown_error", "Unable to resolve membership.")
    }
  }
)

export async function userHasCapability(
  userId: string,
  capability: MembershipCapability
): Promise<ActionResult<boolean>> {
  const membership = await getEffectiveMembership(userId)
  if (!membership.success) {
    return membership as ActionFailure
  }

  const active =
    membership.data.status === "active" ||
    membership.data.status === "trialing" ||
    membership.data.status === "cancel_at_period_end" ||
    membership.data.status === "past_due"

  return success(active && membership.data.capabilities.includes(capability))
}

/**
 * Counts seats that consume capacity: active members and pending invitations.
 * Does not count removed, suspended, or expired invitations.
 */
export async function countOccupiedOrganizationSeats(
  organizationId: string
): Promise<ActionResult<number>> {
  const parsed = organizationIdSchema.safeParse(organizationId)
  if (!parsed.success) {
    return failure("validation_error", firstIssue(parsed.error))
  }

  const supabase = membershipDb()
  const { count, error } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", parsed.data)
    .in("status", ["active", "invited"])

  if (error) {
    return failure("provider_error", "Unable to count organization seats.")
  }

  return success(count ?? 0)
}

export async function countActiveOrganizationSeats(
  organizationId: string
): Promise<ActionResult<number>> {
  const parsed = organizationIdSchema.safeParse(organizationId)
  if (!parsed.success) {
    return failure("validation_error", firstIssue(parsed.error))
  }

  const supabase = membershipDb()
  const { count, error } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", parsed.data)
    .eq("status", "active")

  if (error) {
    return failure("provider_error", "Unable to count organization seats.")
  }

  return success(count ?? 0)
}

/**
 * Blocks reducing seat_limit below currently occupied seats.
 * Preserves the current organization plan/limit until seats are reduced first.
 */
export async function assertOrganizationSeatLimitChange(input: {
  organizationId: string
  newSeatLimit: number
}): Promise<ActionResult<{ allowed: true }>> {
  if (input.newSeatLimit < 0) {
    return failure("validation_error", "Seat limit cannot be negative.")
  }

  const occupied = await countOccupiedOrganizationSeats(input.organizationId)
  if (!occupied.success) {
    return occupied as ActionFailure
  }

  if (input.newSeatLimit > 0 && occupied.data > input.newSeatLimit) {
    return failure(
      "validation_error",
      `Cannot reduce seat limit to ${input.newSeatLimit} while ${occupied.data} seats are occupied. Remove or suspend members first.`
    )
  }

  return success({ allowed: true })
}

export async function inviteOrganizationMember(input: {
  organizationId: string
  email: string
  role?: "owner" | "administrator" | "member"
  assignedPlanId?: string | null
}): Promise<ActionResult<{ id: string }>> {
  const organizationId = organizationIdSchema.safeParse(input.organizationId)
  const email = emailSchema.safeParse(input.email.trim().toLowerCase())

  if (!organizationId.success) {
    return failure("validation_error", firstIssue(organizationId.error))
  }
  if (!email.success) {
    return failure("validation_error", firstIssue(email.error))
  }

  const supabase = membershipDb()
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, seat_limit, status")
    .eq("id", organizationId.data)
    .maybeSingle()

  if (organizationError || !organization) {
    return failure("not_found", "Organization not found.")
  }

  const org = organization as {
    id: string
    seat_limit: number
    status: string
  }

  if (org.status !== "active") {
    return failure("validation_error", "Organization is not active.")
  }

  const seats = await countOccupiedOrganizationSeats(org.id)
  if (!seats.success) {
    return seats as ActionFailure
  }

  if (org.seat_limit > 0 && seats.data >= org.seat_limit) {
    return failure(
      "validation_error",
      "Seat limit reached. Remove or suspend a member before inviting another."
    )
  }

  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      email: email.data,
      role: input.role ?? "member",
      status: "invited",
      assigned_plan_id: input.assignedPlanId ?? null,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return failure(
        "validation_error",
        "That email is already invited to this organization."
      )
    }
    return failure("provider_error", "Unable to invite organization member.")
  }

  const row = data as { id: string }

  await recordMembershipLifecycleEvent({
    eventType: "organization_member_invited",
    sourceEventId: `org_invite:${row.id}`,
    organizationId: org.id,
    metadata: { email: email.data },
  })

  return success({ id: row.id })
}

export async function removeOrganizationMember(input: {
  organizationId: string
  memberId: string
}): Promise<ActionResult<{ released: boolean }>> {
  const organizationId = organizationIdSchema.safeParse(input.organizationId)
  const memberId = z.uuid().safeParse(input.memberId)

  if (!organizationId.success || !memberId.success) {
    return failure("validation_error", "Invalid organization or member id.")
  }

  const supabase = membershipDb()
  const { data, error } = await supabase
    .from("organization_members")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
    })
    .eq("id", memberId.data)
    .eq("organization_id", organizationId.data)
    .select("id, user_id")
    .maybeSingle()

  if (error || !data) {
    return failure("not_found", "Organization member not found.")
  }

  const row = data as { id: string; user_id: string | null }

  await recordMembershipLifecycleEvent({
    eventType: "organization_member_removed",
    sourceEventId: `org_remove:${row.id}:${Date.now()}`,
    userId: row.user_id,
    organizationId: organizationId.data,
  })

  return success({ released: true })
}

export async function suspendOrganizationMember(input: {
  organizationId: string
  memberId: string
}): Promise<ActionResult<{ suspended: boolean }>> {
  const organizationId = organizationIdSchema.safeParse(input.organizationId)
  const memberId = z.uuid().safeParse(input.memberId)

  if (!organizationId.success || !memberId.success) {
    return failure("validation_error", "Invalid organization or member id.")
  }

  const supabase = membershipDb()
  const { data, error } = await supabase
    .from("organization_members")
    .update({
      status: "suspended",
      suspended_at: new Date().toISOString(),
    })
    .eq("id", memberId.data)
    .eq("organization_id", organizationId.data)
    .in("status", ["active", "invited"])
    .select("id, user_id")
    .maybeSingle()

  if (error || !data) {
    return failure("not_found", "Organization member not found.")
  }

  const row = data as { id: string; user_id: string | null }

  await recordMembershipLifecycleEvent({
    eventType: "organization_member_suspended",
    sourceEventId: `org_suspend:${row.id}:${Date.now()}`,
    userId: row.user_id,
    organizationId: organizationId.data,
  })

  return success({ suspended: true })
}

export async function activateOrganizationMember(input: {
  organizationId: string
  memberId: string
  userId: string
}): Promise<ActionResult<{ activated: boolean }>> {
  const organizationId = organizationIdSchema.safeParse(input.organizationId)
  const memberId = z.uuid().safeParse(input.memberId)
  const userId = userIdSchema.safeParse(input.userId)

  if (!organizationId.success || !memberId.success || !userId.success) {
    return failure("validation_error", "Invalid organization, member, or user id.")
  }

  const seats = await countOccupiedOrganizationSeats(organizationId.data)
  if (!seats.success) {
    return seats as ActionFailure
  }

  const supabase = membershipDb()
  const { data: organization } = await supabase
    .from("organizations")
    .select("seat_limit, status")
    .eq("id", organizationId.data)
    .maybeSingle()

  const org = organization as { seat_limit: number; status: string } | null
  if (!org || org.status !== "active") {
    return failure("validation_error", "Organization is not active.")
  }

  // Activating an existing invited row does not increase occupied count
  // (invited already counted). Only block if somehow over capacity.
  if (org.seat_limit > 0 && seats.data > org.seat_limit) {
    return failure(
      "validation_error",
      "Seat limit reached. Remove or suspend a member before activating another."
    )
  }

  const { data, error } = await supabase
    .from("organization_members")
    .update({
      status: "active",
      user_id: userId.data,
      activated_at: new Date().toISOString(),
    })
    .eq("id", memberId.data)
    .eq("organization_id", organizationId.data)
    .eq("status", "invited")
    .select("id, assigned_plan_id")
    .maybeSingle()

  if (error || !data) {
    return failure("not_found", "Invitation not found or already activated.")
  }

  const row = data as { id: string; assigned_plan_id: string | null }

  await recordMembershipLifecycleEvent({
    eventType: "organization_member_activated",
    sourceEventId: `org_activate:${row.id}`,
    userId: userId.data,
    organizationId: organizationId.data,
    planId: row.assigned_plan_id,
  })

  return success({ activated: true })
}
