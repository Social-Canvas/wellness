import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  createVideoSchema,
  updateVideoSchema,
  type CreateVideoInput,
  type UpdateVideoInput,
} from "@/features/videos/schemas"
import type { Video } from "@/features/videos/types"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database/supabase"

const videoIdSchema = z.uuid("Invalid video id.")

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
  if (value === undefined) {
    return null
  }

  const trimmed = value?.trim() ?? ""
  return trimmed === "" ? null : trimmed
}

function mapCreateVideoInput(
  input: CreateVideoInput
): Database["public"]["Tables"]["videos"]["Insert"] {
  return {
    title: input.title,
    description: emptyToNull(input.description ?? null),
    duration_seconds: input.durationSeconds ?? null,
    thumbnail_url: emptyToNull(input.thumbnailUrl ?? null),
    mux_asset_id: emptyToNull(input.muxAssetId ?? null),
    mux_playback_id: emptyToNull(input.muxPlaybackId ?? null),
    status: input.status ?? "draft",
    migration_status: input.migrationStatus ?? "not_started",
  }
}

function mapUpdateVideoInput(
  input: UpdateVideoInput
): Database["public"]["Tables"]["videos"]["Update"] {
  const updates: Database["public"]["Tables"]["videos"]["Update"] = {}

  if (input.title !== undefined) {
    updates.title = input.title
  }

  if (input.description !== undefined) {
    updates.description = emptyToNull(input.description)
  }

  if (input.durationSeconds !== undefined) {
    updates.duration_seconds = input.durationSeconds
  }

  if (input.thumbnailUrl !== undefined) {
    updates.thumbnail_url = emptyToNull(input.thumbnailUrl)
  }

  if (input.muxAssetId !== undefined) {
    updates.mux_asset_id = emptyToNull(input.muxAssetId)
  }

  if (input.muxPlaybackId !== undefined) {
    updates.mux_playback_id = emptyToNull(input.muxPlaybackId)
  }

  if (input.status !== undefined) {
    updates.status = input.status
  }

  if (input.migrationStatus !== undefined) {
    updates.migration_status = input.migrationStatus
  }

  return updates
}

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "23505") {
    return failure("validation_error", "A video with this Mux asset ID already exists.")
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Video not found.")
  }

  return failure("provider_error", "Unable to complete the video request. Please try again.")
}

export async function listVideos(): Promise<ActionResult<Video[]>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("title", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data ?? [])
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getVideo(id: string): Promise<ActionResult<Video>> {
  const parsedId = videoIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("id", parsedId.data)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Video not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function createVideo(
  input: CreateVideoInput
): Promise<ActionResult<Video>> {
  const parsed = createVideoSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("videos")
      .insert(mapCreateVideoInput(parsed.data))
      .select("*")
      .single()

    if (error || !data) {
      return error
        ? mapDatabaseError(error)
        : failure("provider_error", "Unable to create video.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updateVideo(
  id: string,
  input: UpdateVideoInput
): Promise<ActionResult<Video>> {
  const parsedId = videoIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  const parsed = updateVideoSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("videos")
      .update(mapUpdateVideoInput(parsed.data))
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Video not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function archiveVideo(id: string): Promise<ActionResult<Video>> {
  const parsedId = videoIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("videos")
      .update({ status: "archived" })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Video not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
