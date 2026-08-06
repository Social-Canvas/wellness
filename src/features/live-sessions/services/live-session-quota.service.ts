import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  buildVirtualLiveSessionUsageSnapshot,
  canJoinWithQuotaReservation,
  canReserveUnderQuota,
  countQuotaConsumingReservations,
  formatVirtualSessionAllowanceCopy,
  formatVirtualSessionRemainingCopy,
  resolveQuotaPeriodBounds,
  shouldEnforceVirtualSessionQuota,
  virtualLiveSessionQuotaForPlan,
  type VirtualLiveSessionUsageSnapshot,
} from "@/features/live-sessions/utils/virtual-session-quota"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEffectiveMembership } from "@/server/services/membership.service"

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

const idSchema = z.uuid("Invalid id.")

export type MemberVirtualQuotaView = {
  enforcementActive: boolean
  /** Show allowance line (Gold usage or Platinum unlimited). */
  showAllowance: boolean
  unlimited: boolean
  usage: VirtualLiveSessionUsageSnapshot | null
  allowanceCopy: string
  remainingCopy: string | null
  limitReached: boolean
  upgradeHref: string | null
}

export type MemberReservationState = {
  liveClassId: string
  status: "none" | "confirmed" | "attended" | "cancelled"
  reserved: boolean
}

type ReservationRow = {
  id: string
  live_class_id: string
  status: string
}

type RpcReserveResult = {
  ok: boolean
  code?: string
  message?: string
  reservation_id?: string
  status?: string
  used?: number
  limit?: number
  remaining?: number
}

export async function getMemberVirtualQuotaView(
  userId: string,
  now: Date = new Date()
): Promise<ActionResult<MemberVirtualQuotaView>> {
  const membership = await getEffectiveMembership(userId)
  if (!membership.success) {
    return membership
  }

  const planSlug = membership.data.effectiveTierSlug
  const config = virtualLiveSessionQuotaForPlan(planSlug)
  const enforcementActive = shouldEnforceVirtualSessionQuota({
    planSlug,
    accessSource: membership.data.source,
  })

  if (!config) {
    return success({
      enforcementActive: false,
      showAllowance: false,
      unlimited: false,
      usage: null,
      allowanceCopy: "Live virtual sessions are not included in your current plan",
      remainingCopy: null,
      limitReached: false,
      upgradeHref: null,
    })
  }

  if (config.mode === "unlimited" || !enforcementActive) {
    const usage = buildVirtualLiveSessionUsageSnapshot({
      config,
      used: 0,
      periodStart: null,
      periodEnd: null,
      periodLabel: "none",
    })
    // Platinum: surface unlimited copy without activating reserve enforcement.
    // Core / nonprofit: keep silent (legacy boolean join only).
    const showAllowance =
      planSlug === "plan-3" &&
      config.mode === "unlimited" &&
      membership.data.capabilities.includes("live_online_sessions")

    return success({
      enforcementActive,
      showAllowance,
      unlimited: config.mode === "unlimited",
      usage,
      allowanceCopy: formatVirtualSessionAllowanceCopy(usage),
      remainingCopy: formatVirtualSessionRemainingCopy(usage),
      limitReached: false,
      upgradeHref: null,
    })
  }

  const bounds = resolveQuotaPeriodBounds({
    limitPeriod: config.limitPeriod,
    currentPeriodStart: membership.data.currentPeriodStart,
    currentPeriodEnd: membership.data.currentPeriodEnd,
    now,
  })

  if (!bounds || config.limit == null) {
    return failure(
      "unknown_error",
      "Unable to resolve your live virtual session allowance period."
    )
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("live_session_member_reservations")
      .select(
        "status, live_class_id, live_classes!inner(status, starts_at)"
      )
      .eq("user_id", userId)

    if (error) {
      return failure("provider_error", "Unable to load session reservations.")
    }

    const reservations = (
      (data ?? []) as Array<{
        status: string
        live_class_id: string
        live_classes:
          | { status: string; starts_at: string | null }
          | { status: string; starts_at: string | null }[]
          | null
      }>
    ).map((row) => {
      const liveClass = Array.isArray(row.live_classes)
        ? row.live_classes[0]
        : row.live_classes
      return {
        status: row.status,
        registrationType: "member",
        liveClassStatus: liveClass?.status ?? null,
        liveClassStartsAt: liveClass?.starts_at ?? null,
      }
    })

    const used = countQuotaConsumingReservations({
      reservations,
      periodStart: bounds.start,
      periodEnd: bounds.end,
    })

    const usage = buildVirtualLiveSessionUsageSnapshot({
      config,
      used,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      periodLabel: bounds.periodLabel,
    })

    const limitReached = (usage.remaining ?? 0) <= 0

    return success({
      enforcementActive: true,
      showAllowance: true,
      unlimited: false,
      usage,
      allowanceCopy: formatVirtualSessionAllowanceCopy(usage),
      remainingCopy: formatVirtualSessionRemainingCopy(usage),
      limitReached,
      upgradeHref: limitReached
        ? "/checkout/consent?type=membership&planSlug=plan-3&interval=monthly"
        : null,
    })
  } catch {
    return failure("unknown_error", "Unable to load session reservations.")
  }
}

export async function getReservationForLiveClass(
  userId: string,
  liveClassId: string
): Promise<ActionResult<MemberReservationState>> {
  const parsedUser = idSchema.safeParse(userId)
  const parsedClass = idSchema.safeParse(liveClassId)
  if (!parsedUser.success || !parsedClass.success) {
    return failure("validation_error", "Invalid reservation identifiers.")
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("live_session_member_reservations")
      .select("id, live_class_id, status")
      .eq("user_id", parsedUser.data)
      .eq("live_class_id", parsedClass.data)
      .maybeSingle()

    if (error) {
      return failure("provider_error", "Unable to load reservation.")
    }

    const row = data as ReservationRow | null
    if (!row) {
      return success({
        liveClassId: parsedClass.data,
        status: "none",
        reserved: false,
      })
    }

    const status =
      row.status === "confirmed" ||
      row.status === "attended" ||
      row.status === "cancelled"
        ? row.status
        : "none"

    return success({
      liveClassId: parsedClass.data,
      status,
      reserved: status === "confirmed" || status === "attended",
    })
  } catch {
    return failure("unknown_error", "Unable to load reservation.")
  }
}

export async function reserveVirtualLiveSessionForMember(
  userId: string,
  liveClassId: string
): Promise<
  ActionResult<{
    reservationId: string
    status: string
    usage: VirtualLiveSessionUsageSnapshot
    allowanceCopy: string
  }>
> {
  const parsedUser = idSchema.safeParse(userId)
  const parsedClass = idSchema.safeParse(liveClassId)
  if (!parsedUser.success || !parsedClass.success) {
    return failure("validation_error", "Invalid reservation identifiers.")
  }

  const membership = await getEffectiveMembership(parsedUser.data)
  if (!membership.success) {
    return membership
  }

  if (
    !membership.data.capabilities.includes("live_online_sessions")
  ) {
    return failure(
      "entitlement_required",
      "An active membership with live online sessions is required."
    )
  }

  const planSlug = membership.data.effectiveTierSlug
  const config = virtualLiveSessionQuotaForPlan(planSlug)
  const enforcementActive = shouldEnforceVirtualSessionQuota({
    planSlug,
    accessSource: membership.data.source,
  })

  if (!enforcementActive || !config || config.mode !== "limited" || config.limit == null) {
    return failure(
      "entitlement_required",
      "Reservation limits do not apply to your current plan."
    )
  }

  const bounds = resolveQuotaPeriodBounds({
    limitPeriod: config.limitPeriod,
    currentPeriodStart: membership.data.currentPeriodStart,
    currentPeriodEnd: membership.data.currentPeriodEnd,
  })

  if (!bounds) {
    return failure(
      "unknown_error",
      "Unable to resolve your live virtual session allowance period."
    )
  }

  const existing = await getReservationForLiveClass(
    parsedUser.data,
    parsedClass.data
  )
  if (!existing.success) {
    return existing
  }

  const previewUsage = buildVirtualLiveSessionUsageSnapshot({
    config,
    used: 0,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    periodLabel: bounds.periodLabel,
  })

  // Pure gate for duplicate messaging; authoritative count is inside the RPC.
  const preview = canReserveUnderQuota({
    usage: {
      ...previewUsage,
      used: 0,
      remaining: config.limit,
    },
    alreadyReservedForSession: existing.data.reserved,
  })
  if (!preview.ok && existing.data.reserved) {
    return failure("conflict", preview.reason)
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("reserve_virtual_live_session", {
      p_user_id: parsedUser.data,
      p_live_class_id: parsedClass.data,
      p_limit: config.limit,
      p_period_start: bounds.start.toISOString(),
      p_period_end: bounds.end.toISOString(),
    })

    if (error) {
      return failure("provider_error", "Unable to reserve this live session.")
    }

    const result = data as RpcReserveResult
    if (!result?.ok) {
      return failure(
        result?.code === "quota_exceeded" ? "entitlement_required" : "conflict",
        result?.message ?? "Unable to reserve this live session."
      )
    }

    const usage = buildVirtualLiveSessionUsageSnapshot({
      config,
      used: result.used ?? config.limit,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      periodLabel: bounds.periodLabel,
    })

    return success({
      reservationId: result.reservation_id!,
      status: result.status ?? "confirmed",
      usage,
      allowanceCopy: formatVirtualSessionAllowanceCopy(usage),
    })
  } catch {
    return failure("unknown_error", "Unable to reserve this live session.")
  }
}

export async function cancelVirtualLiveSessionReservationForMember(
  userId: string,
  liveClassId: string
): Promise<ActionResult<{ cancelled: true }>> {
  const parsedUser = idSchema.safeParse(userId)
  const parsedClass = idSchema.safeParse(liveClassId)
  if (!parsedUser.success || !parsedClass.success) {
    return failure("validation_error", "Invalid reservation identifiers.")
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc(
      "cancel_virtual_live_session_reservation",
      {
        p_user_id: parsedUser.data,
        p_live_class_id: parsedClass.data,
      }
    )

    if (error) {
      return failure("provider_error", "Unable to cancel reservation.")
    }

    const result = data as RpcReserveResult
    if (!result?.ok) {
      return failure(
        result?.code ?? "conflict",
        result?.message ?? "Unable to cancel reservation."
      )
    }

    return success({ cancelled: true })
  } catch {
    return failure("unknown_error", "Unable to cancel reservation.")
  }
}

export async function assertQuotaJoinAllowed(input: {
  userId: string
  liveClassId: string
  planSlug: string | null
  accessSource: string
}): Promise<ActionResult<{ hasActiveReservation: boolean }>> {
  const enforcementActive = shouldEnforceVirtualSessionQuota({
    planSlug: input.planSlug,
    accessSource: input.accessSource,
  })

  if (!enforcementActive) {
    return success({ hasActiveReservation: false })
  }

  const reservation = await getReservationForLiveClass(
    input.userId,
    input.liveClassId
  )
  if (!reservation.success) {
    return reservation
  }

  const gate = canJoinWithQuotaReservation({
    hasActiveReservation: reservation.data.reserved,
    enforcementActive: true,
  })

  if (!gate.ok) {
    return failure("entitlement_required", gate.reason)
  }

  try {
    const supabase = createAdminClient()
    await supabase.rpc("mark_virtual_live_session_attended", {
      p_user_id: input.userId,
      p_live_class_id: input.liveClassId,
    })
  } catch {
    // Join URL may still be issued if reservation exists; attendance mark is best-effort.
  }

  return success({ hasActiveReservation: true })
}
