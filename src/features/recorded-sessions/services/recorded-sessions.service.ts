import "server-only"

import { cache } from "react"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type {
  CreateRecordedSessionInput,
  UpdateRecordedSessionInput,
} from "@/features/recorded-sessions/schemas"
import {
  createRecordedSessionSchema,
  updateRecordedSessionSchema,
} from "@/features/recorded-sessions/schemas"
import type {
  RecordedSession,
  RecordedSessionDetail,
  RecordedSessionFilters,
  RecordedSessionListItem,
} from "@/features/recorded-sessions/types"
import {
  canPublishRecordedSession,
  filterRecordedSessions,
  isRecordedSessionMemberVisible,
  sortRecordedSessionsNewestFirst,
} from "@/features/recorded-sessions/utils/recorded-sessions"
import { createAdminClient } from "@/lib/supabase/admin"
import { canAccessRecordedSessions } from "@/server/services/entitlement.service"
import type { Database } from "@/types/database/supabase"

const sessionIdSchema = z.uuid("Invalid session id.")
const sessionSlugSchema = z.string().trim().min(1)

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

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "23505") {
    return failure("validation_error", "A recorded session with this slug or Mux asset already exists.")
  }
  if (error.code === "23514") {
    return failure(
      "validation_error",
      "Published sessions require a ready Mux playback ID."
    )
  }
  if (error.code === "PGRST116") {
    return failure("not_found", "Recorded session not found.")
  }
  return failure("provider_error", "Unable to complete the recorded session request.")
}

function toListItem(row: RecordedSession): RecordedSessionListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    recordedAt: row.recorded_at,
    publishedAt: row.published_at,
    durationSeconds: row.duration_seconds,
    presenter: row.presenter,
    monthlyTheme: row.monthly_theme,
    weekNumber: row.week_number,
    weeklyTopic: row.weekly_topic,
    focus: row.focus,
    thumbnailUrl: row.thumbnail_url,
    displayOrder: row.display_order,
  }
}

function toDetail(row: RecordedSession): RecordedSessionDetail {
  return {
    ...toListItem(row),
    hasPlayableMux: Boolean(row.mux_playback_id?.trim()) &&
      (row.processing_status === "ready" || row.processing_status === "published"),
  }
}

function mapCreateInput(
  input: CreateRecordedSessionInput
): Database["public"]["Tables"]["recorded_sessions"]["Insert"] {
  const publicationStatus = input.publicationStatus ?? "draft"
  const processingStatus = input.processingStatus ?? "draft"
  const muxPlaybackId = emptyToNull(input.muxPlaybackId ?? null)

  if (
    publicationStatus === "published" &&
    !canPublishRecordedSession({ processingStatus, muxPlaybackId })
  ) {
    throw new Error("PUBLISH_NOT_READY")
  }

  return {
    title: input.title,
    slug: input.slug,
    short_description: emptyToNull(input.shortDescription ?? null),
    recorded_at: emptyToNull(input.recordedAt ?? null),
    duration_seconds: input.durationSeconds ?? null,
    presenter: emptyToNull(input.presenter ?? null),
    monthly_theme: emptyToNull(input.monthlyTheme ?? null),
    week_number: input.weekNumber ?? null,
    weekly_topic: emptyToNull(input.weeklyTopic ?? null),
    focus: input.focus ?? null,
    thumbnail_url: emptyToNull(input.thumbnailUrl ?? null),
    mux_asset_id: emptyToNull(input.muxAssetId ?? null),
    mux_playback_id: muxPlaybackId,
    processing_status: processingStatus,
    publication_status: publicationStatus,
    display_order: input.displayOrder ?? 0,
    published_at:
      publicationStatus === "published" ? new Date().toISOString() : null,
  }
}

function mapUpdateInput(
  input: UpdateRecordedSessionInput
): Database["public"]["Tables"]["recorded_sessions"]["Update"] {
  const updates: Database["public"]["Tables"]["recorded_sessions"]["Update"] = {}

  if (input.title !== undefined) updates.title = input.title
  if (input.slug !== undefined) updates.slug = input.slug
  if (input.shortDescription !== undefined) {
    updates.short_description = emptyToNull(input.shortDescription)
  }
  if (input.recordedAt !== undefined) {
    updates.recorded_at = emptyToNull(input.recordedAt)
  }
  if (input.durationSeconds !== undefined) {
    updates.duration_seconds = input.durationSeconds
  }
  if (input.presenter !== undefined) {
    updates.presenter = emptyToNull(input.presenter)
  }
  if (input.monthlyTheme !== undefined) {
    updates.monthly_theme = emptyToNull(input.monthlyTheme)
  }
  if (input.weekNumber !== undefined) updates.week_number = input.weekNumber
  if (input.weeklyTopic !== undefined) {
    updates.weekly_topic = emptyToNull(input.weeklyTopic)
  }
  if (input.focus !== undefined) updates.focus = input.focus
  if (input.thumbnailUrl !== undefined) {
    updates.thumbnail_url = emptyToNull(input.thumbnailUrl)
  }
  if (input.muxAssetId !== undefined) {
    updates.mux_asset_id = emptyToNull(input.muxAssetId)
  }
  if (input.muxPlaybackId !== undefined) {
    updates.mux_playback_id = emptyToNull(input.muxPlaybackId)
  }
  if (input.processingStatus !== undefined) {
    updates.processing_status = input.processingStatus
  }
  if (input.displayOrder !== undefined) {
    updates.display_order = input.displayOrder
  }
  if (input.publishedAt !== undefined) {
    updates.published_at = input.publishedAt
  }
  if (input.publicationStatus !== undefined) {
    updates.publication_status = input.publicationStatus
    if (input.publicationStatus === "published" && input.publishedAt === undefined) {
      updates.published_at = new Date().toISOString()
    }
    if (input.publicationStatus === "draft") {
      updates.published_at = null
    }
  }

  return updates
}

export async function listRecordedSessionsAdmin(): Promise<
  ActionResult<RecordedSession[]>
> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("recorded_sessions")
      .select("*")
      .order("display_order", { ascending: true })
      .order("recorded_at", { ascending: false, nullsFirst: false })

    if (error) return mapDatabaseError(error)
    return success((data ?? []) as RecordedSession[])
  } catch {
    return failure("unknown_error", "Unable to list recorded sessions.")
  }
}

export async function getRecordedSessionAdmin(
  id: string
): Promise<ActionResult<RecordedSession>> {
  const parsed = sessionIdSchema.safeParse(id)
  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("recorded_sessions")
      .select("*")
      .eq("id", parsed.data)
      .single()

    if (error) return mapDatabaseError(error)
    return success(data as RecordedSession)
  } catch {
    return failure("unknown_error", "Unable to load recorded session.")
  }
}

export async function createRecordedSession(
  input: CreateRecordedSessionInput
): Promise<ActionResult<RecordedSession>> {
  const parsed = createRecordedSessionSchema.safeParse(input)
  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    let row: Database["public"]["Tables"]["recorded_sessions"]["Insert"]
    try {
      row = mapCreateInput(parsed.data)
    } catch (error) {
      if (error instanceof Error && error.message === "PUBLISH_NOT_READY") {
        return validationFailure(
          "Publish requires a ready Mux asset with a signed playback ID."
        )
      }
      throw error
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("recorded_sessions")
      .insert(row)
      .select("*")
      .single()

    if (error) return mapDatabaseError(error)
    return success(data as RecordedSession)
  } catch {
    return failure("unknown_error", "Unable to create recorded session.")
  }
}

export async function updateRecordedSession(
  id: string,
  input: UpdateRecordedSessionInput
): Promise<ActionResult<RecordedSession>> {
  const parsedId = sessionIdSchema.safeParse(id)
  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  const parsed = updateRecordedSessionSchema.safeParse(input)
  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const existing = await getRecordedSessionAdmin(parsedId.data)
    if (!existing.success) return existing

    const updates = mapUpdateInput(parsed.data)
    const nextPublication =
      updates.publication_status ?? existing.data.publication_status
    const nextProcessing =
      updates.processing_status ?? existing.data.processing_status
    const nextPlayback =
      updates.mux_playback_id !== undefined
        ? updates.mux_playback_id
        : existing.data.mux_playback_id

    if (
      nextPublication === "published" &&
      !canPublishRecordedSession({
        processingStatus: nextProcessing,
        muxPlaybackId: nextPlayback,
      })
    ) {
      return validationFailure(
        "Publish requires a ready Mux asset with a signed playback ID."
      )
    }

    // Safe replace: attaching a new Mux asset must not delete the previous one.
    // Callers clear/replace IDs explicitly; we never call Mux delete here.

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("recorded_sessions")
      .update(updates)
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error) return mapDatabaseError(error)
    return success(data as RecordedSession)
  } catch {
    return failure("unknown_error", "Unable to update recorded session.")
  }
}

export async function publishRecordedSession(
  id: string
): Promise<ActionResult<RecordedSession>> {
  return updateRecordedSession(id, { publicationStatus: "published" })
}

export async function unpublishRecordedSession(
  id: string
): Promise<ActionResult<RecordedSession>> {
  return updateRecordedSession(id, { publicationStatus: "draft" })
}

export async function archiveRecordedSession(
  id: string
): Promise<ActionResult<RecordedSession>> {
  return updateRecordedSession(id, { publicationStatus: "archived" })
}

/**
 * Idempotent attach of an existing Mux asset. Never creates Mux uploads.
 */
export async function linkExistingMuxAssetToSession(input: {
  sessionId: string
  muxAssetId: string
  muxPlaybackId: string
  durationSeconds?: number | null
  thumbnailUrl?: string | null
  processingStatus?: Database["public"]["Enums"]["video_status"]
}): Promise<ActionResult<RecordedSession>> {
  return updateRecordedSession(input.sessionId, {
    muxAssetId: input.muxAssetId,
    muxPlaybackId: input.muxPlaybackId,
    durationSeconds: input.durationSeconds ?? undefined,
    thumbnailUrl: input.thumbnailUrl ?? undefined,
    processingStatus: input.processingStatus ?? "ready",
  })
}

export async function syncRecordedSessionMuxAsset(input: {
  muxAssetId: string
  muxPlaybackId: string | null
  status: "ready" | "processing" | "failed"
  durationSeconds?: number | null
  thumbnailUrl?: string | null
}): Promise<ActionResult<RecordedSession | null>> {
  try {
    const supabase = createAdminClient()
    const { data: existing, error: findError } = await supabase
      .from("recorded_sessions")
      .select("id")
      .eq("mux_asset_id", input.muxAssetId)
      .maybeSingle()

    if (findError) return mapDatabaseError(findError)
    if (!existing) return success(null)

    const processingStatus =
      input.status === "ready"
        ? "ready"
        : input.status === "failed"
          ? "failed"
          : "processing"

    return updateRecordedSession(existing.id, {
      muxPlaybackId: input.muxPlaybackId,
      processingStatus,
      durationSeconds: input.durationSeconds ?? undefined,
      thumbnailUrl: input.thumbnailUrl ?? undefined,
    })
  } catch {
    return failure("unknown_error", "Unable to sync recorded session Mux asset.")
  }
}

export const listPublishedRecordedSessionsForMember = cache(
  async (
    userId: string,
    filters: RecordedSessionFilters = {}
  ): Promise<ActionResult<RecordedSessionListItem[]>> => {
    const access = await canAccessRecordedSessions(userId)
    if (!access.success) return access
    if (!access.data) {
      return failure(
        "entitlement_required",
        "An active Elevate membership is required to view recorded sessions."
      )
    }

    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from("recorded_sessions")
        .select("*")
        .eq("publication_status", "published")
        .order("display_order", { ascending: true })
        .order("recorded_at", { ascending: false, nullsFirst: false })

      if (error) return mapDatabaseError(error)

      const visible = ((data ?? []) as RecordedSession[])
        .filter((row) =>
          isRecordedSessionMemberVisible({
            publicationStatus: row.publication_status,
            processingStatus: row.processing_status,
            muxPlaybackId: row.mux_playback_id,
          })
        )
        .map(toListItem)

      const sorted = sortRecordedSessionsNewestFirst(visible)
      return success(filterRecordedSessions(sorted, filters))
    } catch {
      return failure("unknown_error", "Unable to load recorded sessions.")
    }
  }
)

export const getPublishedRecordedSessionForMember = cache(
  async (
    userId: string,
    sessionIdOrSlug: string
  ): Promise<ActionResult<RecordedSessionDetail & { muxPlaybackId: string }>> => {
    const access = await canAccessRecordedSessions(userId)
    if (!access.success) return access
    if (!access.data) {
      return failure(
        "entitlement_required",
        "An active Elevate membership is required to view recorded sessions."
      )
    }

    const byId = sessionIdSchema.safeParse(sessionIdOrSlug)
    const bySlug = sessionSlugSchema.safeParse(sessionIdOrSlug)
    if (!byId.success && !bySlug.success) {
      return validationFailure("Invalid session id.")
    }

    try {
      const supabase = createAdminClient()
      let query = supabase.from("recorded_sessions").select("*")
      query = byId.success
        ? query.eq("id", byId.data)
        : query.eq("slug", bySlug.data!)

      const { data, error } = await query.maybeSingle()
      if (error) return mapDatabaseError(error)
      if (!data) return failure("not_found", "Recorded session not found.")

      const row = data as RecordedSession
      if (
        !isRecordedSessionMemberVisible({
          publicationStatus: row.publication_status,
          processingStatus: row.processing_status,
          muxPlaybackId: row.mux_playback_id,
        })
      ) {
        return failure("not_found", "Recorded session not found.")
      }

      if (!row.mux_playback_id) {
        return failure("not_found", "Playback is not configured for this session.")
      }

      return success({
        ...toDetail(row),
        muxPlaybackId: row.mux_playback_id,
      })
    } catch {
      return failure("unknown_error", "Unable to load recorded session.")
    }
  }
)

export async function getRecordedSessionForPlayback(
  sessionId: string
): Promise<ActionResult<RecordedSession>> {
  const parsed = sessionIdSchema.safeParse(sessionId)
  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("recorded_sessions")
      .select("*")
      .eq("id", parsed.data)
      .single()

    if (error) return mapDatabaseError(error)
    return success(data as RecordedSession)
  } catch {
    return failure("unknown_error", "Unable to load recorded session.")
  }
}
