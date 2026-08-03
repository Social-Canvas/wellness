import "server-only"

import { syncVideoAsset } from "@/server/integrations/mux/upload"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMuxClient } from "@/server/integrations/mux/client"
import { syncRecordedSessionMuxAsset } from "@/features/recorded-sessions/services/recorded-sessions.service"
import type { Database } from "@/types/database/supabase"

type WebhookEventStatus = Database["public"]["Enums"]["webhook_event_status"]

export type MuxWebhookResult =
  | { status: "processed" }
  | { status: "duplicate" }
  | { status: "ignored" }
  | { status: "failed"; message: string }

const ASSET_SYNC_EVENTS = new Set<string>([
  "video.asset.ready",
  "video.asset.updated",
  "video.asset.errored",
  "video.upload.asset_created",
])

async function recordWebhookEvent(event: {
  id: string
  type: string
  data: unknown
}): Promise<"new" | "duplicate"> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("webhook_events").insert({
    provider: "mux",
    provider_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Database["public"]["Tables"]["webhook_events"]["Insert"]["payload"],
    status: "received",
  })

  if (error?.code === "23505") {
    return "duplicate"
  }

  if (error) {
    throw new Error(error.message)
  }

  return "new"
}

async function updateWebhookEventStatus(
  providerEventId: string,
  status: WebhookEventStatus,
  errorMessage?: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("webhook_events")
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: status === "processed" ? new Date().toISOString() : null,
    })
    .eq("provider", "mux")
    .eq("provider_event_id", providerEventId)

  if (error) {
    throw new Error(error.message)
  }
}

async function getExistingWebhookStatus(
  providerEventId: string
): Promise<WebhookEventStatus | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("webhook_events")
    .select("status")
    .eq("provider", "mux")
    .eq("provider_event_id", providerEventId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.status ?? null
}

function getAssetIdFromEvent(event: { type: string; data: { object: unknown } }): string | null {
  const payload = event.data.object as {
    id?: string
    asset_id?: string
  }

  if (event.type === "video.upload.asset_created") {
    return payload.asset_id ?? null
  }

  return payload.id ?? null
}

async function processMuxEvent(event: { type: string; data: { object: unknown } }): Promise<void> {
  if (!ASSET_SYNC_EVENTS.has(event.type)) {
    return
  }

  const assetId = getAssetIdFromEvent(event)

  if (!assetId) {
    return
  }

  const videoSyncResult = await syncVideoAsset(assetId)
  // Video sync may legitimately miss when the asset belongs only to recorded_sessions.
  if (!videoSyncResult.success && videoSyncResult.error.code !== "not_found") {
    throw new Error(videoSyncResult.error.message)
  }

  try {
    const mux = getMuxClient()
    const asset = await mux.video.assets.retrieve(assetId)
    const playbackIds = asset.playback_ids ?? []
    const signed = playbackIds.find((playback) => playback.policy === "signed")
    const playbackId = signed?.id ?? playbackIds[0]?.id ?? null
    const status =
      asset.status === "ready"
        ? "ready"
        : asset.status === "errored"
          ? "failed"
          : "processing"
    const durationSeconds =
      typeof asset.duration === "number" ? Math.round(asset.duration) : null
    const thumbnailUrl = playbackId
      ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
      : null

    const sessionSync = await syncRecordedSessionMuxAsset({
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      status,
      durationSeconds,
      thumbnailUrl,
    })

    if (!sessionSync.success) {
      throw new Error(sessionSync.error.message)
    }

    if (!videoSyncResult.success && !sessionSync.data) {
      throw new Error(videoSyncResult.error.message)
    }
  } catch (error) {
    if (!videoSyncResult.success) {
      throw error instanceof Error
        ? error
        : new Error(videoSyncResult.error.message)
    }
    // Video synced; recorded-session sync is best-effort additive.
  }
}

type MuxWebhookEvent = {
  id: string
  type: string
  data: { object: unknown }
}

export async function handleMuxWebhook(
  payload: string,
  headers: Headers
): Promise<MuxWebhookResult> {
  let event: MuxWebhookEvent

  try {
    const mux = getMuxClient()
    event = (await mux.webhooks.unwrap(payload, headers)) as unknown as MuxWebhookEvent
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "Invalid Mux webhook signature.",
    }
  }

  const recordStatus = await recordWebhookEvent(event)

  if (recordStatus === "duplicate") {
    const existingStatus = await getExistingWebhookStatus(event.id)

    if (existingStatus === "processed" || existingStatus === "ignored") {
      return { status: "duplicate" }
    }
  }

  try {
    if (!ASSET_SYNC_EVENTS.has(event.type)) {
      await updateWebhookEventStatus(event.id, "ignored")
      return { status: "ignored" }
    }

    await processMuxEvent(event)
    await updateWebhookEventStatus(event.id, "processed")
    return { status: "processed" }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process Mux webhook."

    await updateWebhookEventStatus(event.id, "failed", message)
    return { status: "failed", message }
  }
}
