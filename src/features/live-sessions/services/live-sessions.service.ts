import "server-only"

import { cache } from "react"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type {
  CreateLiveSessionInput,
  LiveSessionFeedbackInput,
  UpdateLiveSessionInput,
} from "@/features/live-sessions/schemas"
import type {
  LiveSessionAdmin,
  LiveSessionJoinResult,
  LiveSessionPublic,
} from "@/features/live-sessions/types"
import {
  canMemberJoinLiveSession,
  canTrialUserJoinLiveSession,
  membershipCtaPathAfterTrial,
  shouldOfferTrialFeedback,
  toPublicLiveSessionCard,
  type LiveRegistrationStatus,
  type LiveRegistrationType,
  type SafeLiveSessionPublicFields,
} from "@/features/live-sessions/utils/live-sessions"
import { createAdminClient } from "@/lib/supabase/admin"
import { userHasCapability } from "@/server/services/membership.service"
import { recordMembershipLifecycleEvent } from "@/server/services/membership.service"

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

const idSchema = z.uuid("Invalid id.")

type LiveClassRow = SafeLiveSessionPublicFields & {
  calendly_url?: string | null
}

function mapPublic(row: LiveClassRow): LiveSessionPublic {
  const card = toPublicLiveSessionCard(row)
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    startsAt: card.startsAt,
    endsAt: card.endsAt,
    sessionKind: card.sessionKind,
    allowsPublicTrial: card.allowsPublicTrial,
    trialOpen: card.trialOpen,
    capacity: card.capacity,
    status: card.status,
    accessType: row.access_type,
    completedAt: row.completed_at,
  }
}

const PUBLIC_SELECT =
  "id, title, description, starts_at, ends_at, session_kind, allows_public_trial, trial_open, capacity, status, access_type, plan_id, completed_at, calendly_url"

export const listUpcomingLiveSessionsForMembers = cache(
  async (userId: string): Promise<ActionResult<LiveSessionPublic[]>> => {
    const parsed = idSchema.safeParse(userId)
    if (!parsed.success) {
      return failure("validation_error", firstIssue(parsed.error))
    }

    const capability = await userHasCapability(
      parsed.data,
      "live_online_sessions"
    )
    if (!capability.success) {
      return capability
    }
    if (!capability.data) {
      return failure(
        "entitlement_required",
        "An active membership with live online sessions is required."
      )
    }

    try {
      const supabase = createAdminClient()
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("live_classes")
        .select(PUBLIC_SELECT)
        .eq("status", "published")
        .is("completed_at", null)
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(24)

      if (error) {
        return failure("provider_error", "Unable to load live sessions.")
      }

      return success(((data ?? []) as LiveClassRow[]).map(mapPublic))
    } catch {
      return failure("unknown_error", "Unable to load live sessions.")
    }
  }
)

export const listTrialOpenLiveSessions = cache(
  async (): Promise<ActionResult<LiveSessionPublic[]>> => {
    try {
      const supabase = createAdminClient()
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("live_classes")
        .select(PUBLIC_SELECT)
        .eq("status", "published")
        .eq("allows_public_trial", true)
        .eq("trial_open", true)
        .is("completed_at", null)
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(12)

      if (error) {
        return failure("provider_error", "Unable to load trial sessions.")
      }

      return success(((data ?? []) as LiveClassRow[]).map(mapPublic))
    } catch {
      return failure("unknown_error", "Unable to load trial sessions.")
    }
  }
)

export async function listLiveSessionsAdmin(): Promise<
  ActionResult<LiveSessionAdmin[]>
> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("live_classes")
      .select(PUBLIC_SELECT)
      .order("starts_at", { ascending: false, nullsFirst: false })
      .limit(100)

    if (error) {
      return failure("provider_error", "Unable to load live sessions.")
    }

    const sessions = (data ?? []) as LiveClassRow[]
    const ids = sessions.map((s) => s.id)

    const [{ data: secrets }, { data: registrations }] = await Promise.all([
      ids.length
        ? supabase
            .from("live_class_secrets")
            .select("live_class_id, zoom_participant_url, zoom_host_url")
            .in("live_class_id", ids)
        : Promise.resolve({ data: [] as Array<{
            live_class_id: string
            zoom_participant_url: string | null
            zoom_host_url: string | null
          }> }),
      ids.length
        ? supabase
            .from("live_session_registrations")
            .select("live_class_id, registration_type, status")
            .in("live_class_id", ids)
        : Promise.resolve({ data: [] as Array<{
            live_class_id: string
            registration_type: string
            status: string
          }> }),
    ])

    const secretMap = new Map(
      (
        (secrets ?? []) as Array<{
          live_class_id: string
          zoom_participant_url: string | null
          zoom_host_url: string | null
        }>
      ).map((row) => [row.live_class_id, row])
    )

    const counts = new Map<string, { total: number; trial: number }>()
    for (const row of (registrations ?? []) as Array<{
      live_class_id: string
      registration_type: string
      status: string
    }>) {
      if (!["confirmed", "attended", "pending_payment"].includes(row.status)) {
        continue
      }
      const current = counts.get(row.live_class_id) ?? { total: 0, trial: 0 }
      current.total += 1
      if (row.registration_type === "public_trial") {
        current.trial += 1
      }
      counts.set(row.live_class_id, current)
    }

    return success(
      sessions.map((row) => {
        const secret = secretMap.get(row.id)
        const count = counts.get(row.id) ?? { total: 0, trial: 0 }
        const publicSession = mapPublic(row)
        return {
          ...publicSession,
          calendlyUrl: row.calendly_url ?? null,
          hasParticipantUrl: Boolean(secret?.zoom_participant_url),
          hasHostUrl: Boolean(secret?.zoom_host_url),
          registrationCount: count.total,
          trialRegistrationCount: count.trial,
        }
      })
    )
  } catch {
    return failure("unknown_error", "Unable to load live sessions.")
  }
}

export async function createLiveSession(
  input: CreateLiveSessionInput
): Promise<ActionResult<LiveSessionAdmin>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("live_classes")
      .insert({
        title: input.title,
        description: input.description ?? null,
        starts_at: input.startsAt,
        ends_at: input.endsAt ?? null,
        capacity: input.capacity ?? null,
        session_kind: input.sessionKind,
        allows_public_trial: input.allowsPublicTrial,
        trial_open: input.trialOpen,
        access_type: input.accessType,
        status: input.status,
        calendly_url: input.calendlyUrl ?? null,
        zoom_join_url: null,
      })
      .select(PUBLIC_SELECT)
      .single()

    if (error || !data) {
      return failure("provider_error", "Unable to create live session.")
    }

    const row = data as LiveClassRow

    if (input.zoomParticipantUrl || input.zoomHostUrl) {
      const { error: secretError } = await supabase
        .from("live_class_secrets")
        .upsert({
          live_class_id: row.id,
          zoom_participant_url: input.zoomParticipantUrl ?? null,
          zoom_host_url: input.zoomHostUrl ?? null,
        })

      if (secretError) {
        return failure("provider_error", "Unable to store Zoom credentials.")
      }
    }

    return success({
      ...mapPublic(row),
      calendlyUrl: row.calendly_url ?? null,
      hasParticipantUrl: Boolean(input.zoomParticipantUrl),
      hasHostUrl: Boolean(input.zoomHostUrl),
      registrationCount: 0,
      trialRegistrationCount: 0,
    })
  } catch {
    return failure("unknown_error", "Unable to create live session.")
  }
}

export async function updateLiveSession(
  id: string,
  input: UpdateLiveSessionInput
): Promise<ActionResult<LiveSessionPublic>> {
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) {
    return failure("validation_error", firstIssue(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const patch: {
      title?: string
      description?: string | null
      starts_at?: string
      ends_at?: string | null
      capacity?: number | null
      session_kind?: "membership_weekly" | "public_trial"
      allows_public_trial?: boolean
      trial_open?: boolean
      access_type?: "public" | "authenticated" | "member_only" | "plan_specific"
      status?: "draft" | "published" | "archived"
      calendly_url?: string | null
      completed_at?: string | null
    } = {}
    if (input.title !== undefined) patch.title = input.title
    if (input.description !== undefined) patch.description = input.description
    if (input.startsAt !== undefined) patch.starts_at = input.startsAt
    if (input.endsAt !== undefined) patch.ends_at = input.endsAt
    if (input.capacity !== undefined) patch.capacity = input.capacity
    if (input.sessionKind !== undefined) patch.session_kind = input.sessionKind
    if (input.allowsPublicTrial !== undefined) {
      patch.allows_public_trial = input.allowsPublicTrial
    }
    if (input.trialOpen !== undefined) patch.trial_open = input.trialOpen
    if (input.accessType !== undefined) patch.access_type = input.accessType
    if (input.status !== undefined) patch.status = input.status
    if (input.calendlyUrl !== undefined) patch.calendly_url = input.calendlyUrl
    if (input.completedAt !== undefined) patch.completed_at = input.completedAt

    const { data, error } = await supabase
      .from("live_classes")
      .update(patch)
      .eq("id", parsedId.data)
      .select(PUBLIC_SELECT)
      .single()

    if (error || !data) {
      return failure("provider_error", "Unable to update live session.")
    }

    if (
      input.zoomParticipantUrl !== undefined ||
      input.zoomHostUrl !== undefined
    ) {
      const { data: existing } = await supabase
        .from("live_class_secrets")
        .select("zoom_participant_url, zoom_host_url")
        .eq("live_class_id", parsedId.data)
        .maybeSingle()

      const existingRow = existing as {
        zoom_participant_url: string | null
        zoom_host_url: string | null
      } | null

      const { error: secretError } = await supabase
        .from("live_class_secrets")
        .upsert({
          live_class_id: parsedId.data,
          zoom_participant_url:
            input.zoomParticipantUrl !== undefined
              ? input.zoomParticipantUrl
              : (existingRow?.zoom_participant_url ?? null),
          zoom_host_url:
            input.zoomHostUrl !== undefined
              ? input.zoomHostUrl
              : (existingRow?.zoom_host_url ?? null),
        })

      if (secretError) {
        return failure("provider_error", "Unable to update Zoom credentials.")
      }
    }

    return success(mapPublic(data as LiveClassRow))
  } catch {
    return failure("unknown_error", "Unable to update live session.")
  }
}

export async function markLiveSessionCompleted(
  liveClassId: string
): Promise<ActionResult<{ completed: true }>> {
  const parsedId = idSchema.safeParse(liveClassId)
  if (!parsedId.success) {
    return failure("validation_error", firstIssue(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const completedAt = new Date().toISOString()
    const { error } = await supabase
      .from("live_classes")
      .update({
        completed_at: completedAt,
        trial_open: false,
      })
      .eq("id", parsedId.data)

    if (error) {
      return failure("provider_error", "Unable to mark session completed.")
    }

    const { data: trials } = await supabase
      .from("live_session_registrations")
      .select("id, user_id")
      .eq("live_class_id", parsedId.data)
      .eq("registration_type", "public_trial")
      .in("status", ["confirmed", "attended"])

    for (const trial of (trials ?? []) as Array<{
      id: string
      user_id: string
    }>) {
      await recordMembershipLifecycleEvent({
        eventType: "live_session_completed_feedback",
        sourceEventId: `live_session_completed_feedback:${trial.id}`,
        userId: trial.user_id,
        metadata: {
          liveClassId: parsedId.data,
          registrationId: trial.id,
          membershipCtaPath: membershipCtaPathAfterTrial(),
        },
        processEmailImmediately: false,
      })
      await recordMembershipLifecycleEvent({
        eventType: "live_trial_membership_cta",
        sourceEventId: `live_trial_membership_cta:${trial.id}`,
        userId: trial.user_id,
        metadata: {
          liveClassId: parsedId.data,
          registrationId: trial.id,
          membershipCtaPath: membershipCtaPathAfterTrial(),
        },
        processEmailImmediately: false,
      })
    }

    return success({ completed: true })
  } catch {
    return failure("unknown_error", "Unable to mark session completed.")
  }
}

async function loadParticipantUrl(
  liveClassId: string
): Promise<ActionResult<string>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("live_class_secrets")
    .select("zoom_participant_url")
    .eq("live_class_id", liveClassId)
    .maybeSingle()

  if (error) {
    return failure("provider_error", "Unable to resolve join link.")
  }

  const url = (data as { zoom_participant_url: string | null } | null)
    ?.zoom_participant_url
  if (!url) {
    return failure(
      "not_found",
      "Join link is not configured for this session yet."
    )
  }

  return success(url)
}

export async function issueMemberJoinUrl(
  userId: string,
  liveClassId: string
): Promise<ActionResult<LiveSessionJoinResult>> {
  const parsedUser = idSchema.safeParse(userId)
  const parsedClass = idSchema.safeParse(liveClassId)
  if (!parsedUser.success) {
    return failure("validation_error", firstIssue(parsedUser.error))
  }
  if (!parsedClass.success) {
    return failure("validation_error", firstIssue(parsedClass.error))
  }

  const capability = await userHasCapability(
    parsedUser.data,
    "live_online_sessions"
  )
  if (!capability.success) {
    return capability
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("live_classes")
      .select(PUBLIC_SELECT)
      .eq("id", parsedClass.data)
      .maybeSingle()

    if (error || !data) {
      return failure("not_found", "Live session not found.")
    }

    const row = data as LiveClassRow
    const gate = canMemberJoinLiveSession({
      hasLiveOnlineCapability: capability.data,
      sessionStatus: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      completedAt: row.completed_at,
    })

    if (!gate.ok) {
      return failure("entitlement_required", gate.reason)
    }

    const urlResult = await loadParticipantUrl(parsedClass.data)
    if (!urlResult.success) {
      return urlResult
    }

    await supabase.from("live_session_registrations").upsert(
      {
        live_class_id: parsedClass.data,
        user_id: parsedUser.data,
        registration_type: "member",
        status: "attended",
        attended_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "live_class_id,user_id,registration_type" }
    )

    return success({
      liveClassId: parsedClass.data,
      joinUrl: urlResult.data,
      opensAtHint: "Join is available during the session window.",
    })
  } catch {
    return failure("unknown_error", "Unable to issue join link.")
  }
}

export async function issueTrialJoinUrl(
  userId: string,
  liveClassId: string
): Promise<ActionResult<LiveSessionJoinResult>> {
  const parsedUser = idSchema.safeParse(userId)
  const parsedClass = idSchema.safeParse(liveClassId)
  if (!parsedUser.success) {
    return failure("validation_error", firstIssue(parsedUser.error))
  }
  if (!parsedClass.success) {
    return failure("validation_error", firstIssue(parsedClass.error))
  }

  try {
    const supabase = createAdminClient()
    const [{ data: session }, { data: registration }] = await Promise.all([
      supabase
        .from("live_classes")
        .select(PUBLIC_SELECT)
        .eq("id", parsedClass.data)
        .maybeSingle(),
      supabase
        .from("live_session_registrations")
        .select("id, live_class_id, registration_type, status")
        .eq("user_id", parsedUser.data)
        .eq("live_class_id", parsedClass.data)
        .eq("registration_type", "public_trial")
        .maybeSingle(),
    ])

    if (!session) {
      return failure("not_found", "Live session not found.")
    }

    const row = session as LiveClassRow
    const reg = registration as {
      id: string
      live_class_id: string
      registration_type: LiveRegistrationType
      status: LiveRegistrationStatus
    } | null

    const gate = canTrialUserJoinLiveSession({
      registrationStatus: reg?.status ?? null,
      registrationType: reg?.registration_type ?? null,
      liveClassId: parsedClass.data,
      registrationLiveClassId: reg?.live_class_id ?? null,
      sessionStatus: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      completedAt: row.completed_at,
    })

    if (!gate.ok) {
      return failure("entitlement_required", gate.reason)
    }

    const urlResult = await loadParticipantUrl(parsedClass.data)
    if (!urlResult.success) {
      return urlResult
    }

    if (reg && reg.status === "confirmed") {
      await supabase
        .from("live_session_registrations")
        .update({
          status: "attended",
          attended_at: new Date().toISOString(),
        })
        .eq("id", reg.id)
    }

    return success({
      liveClassId: parsedClass.data,
      joinUrl: urlResult.data,
      opensAtHint: "Trial join is limited to this registered session only.",
    })
  } catch {
    return failure("unknown_error", "Unable to issue trial join link.")
  }
}

export async function confirmLiveTrialRegistrationFromWebhook(input: {
  userId: string
  productId: string
  liveClassId: string
  orderId: string
  stripeCheckoutSessionId: string
}): Promise<ActionResult<{ registrationId: string }>> {
  const parsedUser = idSchema.safeParse(input.userId)
  const parsedProduct = idSchema.safeParse(input.productId)
  const parsedClass = idSchema.safeParse(input.liveClassId)
  if (!parsedUser.success || !parsedProduct.success || !parsedClass.success) {
    return failure("validation_error", "Invalid trial registration identifiers.")
  }

  try {
    const supabase = createAdminClient()
    const { data: session, error: sessionError } = await supabase
      .from("live_classes")
      .select("id, allows_public_trial, trial_open, status, completed_at")
      .eq("id", parsedClass.data)
      .maybeSingle()

    if (sessionError || !session) {
      return failure("not_found", "Trial live session not found.")
    }

    const live = session as {
      id: string
      allows_public_trial: boolean
      trial_open: boolean
      status: string
      completed_at: string | null
    }

    if (
      live.status !== "published" ||
      !live.allows_public_trial ||
      live.completed_at
    ) {
      return failure(
        "validation_error",
        "This live session is not open for trial registration."
      )
    }

    const confirmedAt = new Date().toISOString()
    const { data, error } = await supabase
      .from("live_session_registrations")
      .upsert(
        {
          live_class_id: parsedClass.data,
          user_id: parsedUser.data,
          registration_type: "public_trial",
          status: "confirmed",
          product_id: parsedProduct.data,
          order_id: input.orderId,
          stripe_checkout_session_id: input.stripeCheckoutSessionId,
          confirmed_at: confirmedAt,
        },
        { onConflict: "live_class_id,user_id,registration_type" }
      )
      .select("id")
      .single()

    if (error || !data) {
      return failure("provider_error", "Unable to confirm trial registration.")
    }

    const registrationId = (data as { id: string }).id

    await recordMembershipLifecycleEvent({
      eventType: "live_trial_registered",
      sourceEventId: `live_trial_registered:${input.stripeCheckoutSessionId}`,
      userId: parsedUser.data,
      metadata: {
        liveClassId: parsedClass.data,
        registrationId,
        orderId: input.orderId,
        productId: parsedProduct.data,
      },
      processEmailImmediately: false,
    })

    return success({ registrationId })
  } catch {
    return failure("unknown_error", "Unable to confirm trial registration.")
  }
}

export async function submitLiveSessionFeedback(
  userId: string,
  input: LiveSessionFeedbackInput
): Promise<
  ActionResult<{ feedbackId: string; membershipCtaPath: string | null }>
> {
  const parsedUser = idSchema.safeParse(userId)
  if (!parsedUser.success) {
    return failure("validation_error", firstIssue(parsedUser.error))
  }

  try {
    const supabase = createAdminClient()
    const { data: registration, error } = await supabase
      .from("live_session_registrations")
      .select(
        "id, user_id, live_class_id, registration_type, status, feedback_submitted_at"
      )
      .eq("id", input.registrationId)
      .maybeSingle()

    if (error || !registration) {
      return failure("not_found", "Registration not found.")
    }

    const reg = registration as {
      id: string
      user_id: string
      live_class_id: string
      registration_type: LiveRegistrationType
      status: LiveRegistrationStatus
      feedback_submitted_at: string | null
    }

    if (reg.user_id !== parsedUser.data) {
      return failure("authorization_failed", "Not allowed.")
    }

    const { data: liveClass } = await supabase
      .from("live_classes")
      .select("completed_at")
      .eq("id", reg.live_class_id)
      .maybeSingle()

    const completed = Boolean(
      (liveClass as { completed_at: string | null } | null)?.completed_at
    )

    if (
      !shouldOfferTrialFeedback({
        registrationType: reg.registration_type,
        registrationStatus: reg.status,
        sessionCompleted: completed || reg.status === "attended",
        feedbackSubmitted: Boolean(reg.feedback_submitted_at),
      }) &&
      reg.registration_type === "public_trial"
    ) {
      if (reg.feedback_submitted_at) {
        return failure("validation_error", "Feedback already submitted.")
      }
    }

    const { data: feedback, error: feedbackError } = await supabase
      .from("live_session_feedback")
      .upsert(
        {
          registration_id: reg.id,
          live_class_id: reg.live_class_id,
          user_id: parsedUser.data,
          rating: input.rating ?? null,
          comment: input.comment ?? null,
          interested_in_membership: input.interestedInMembership ?? null,
        },
        { onConflict: "registration_id" }
      )
      .select("id")
      .single()

    if (feedbackError || !feedback) {
      return failure("provider_error", "Unable to save feedback.")
    }

    await supabase
      .from("live_session_registrations")
      .update({ feedback_submitted_at: new Date().toISOString() })
      .eq("id", reg.id)

    const cta =
      reg.registration_type === "public_trial"
        ? membershipCtaPathAfterTrial()
        : null

    return success({
      feedbackId: (feedback as { id: string }).id,
      membershipCtaPath: cta,
    })
  } catch {
    return failure("unknown_error", "Unable to save feedback.")
  }
}

export async function attachRecordingToCompletedLiveSession(input: {
  liveClassId: string
  recordedSessionId: string
}): Promise<ActionResult<{ linked: true }>> {
  const parsedLive = idSchema.safeParse(input.liveClassId)
  const parsedRecording = idSchema.safeParse(input.recordedSessionId)
  if (!parsedLive.success || !parsedRecording.success) {
    return failure("validation_error", "Invalid session identifiers.")
  }

  try {
    const supabase = createAdminClient()
    const { data: live, error: liveError } = await supabase
      .from("live_classes")
      .select("id, completed_at")
      .eq("id", parsedLive.data)
      .maybeSingle()

    if (liveError || !live) {
      return failure("not_found", "Live session not found.")
    }

    const { error } = await supabase
      .from("recorded_sessions")
      .update({ live_class_id: parsedLive.data })
      .eq("id", parsedRecording.data)

    if (error) {
      return failure("provider_error", "Unable to attach recording.")
    }

    return success({ linked: true })
  } catch {
    return failure("unknown_error", "Unable to attach recording.")
  }
}
