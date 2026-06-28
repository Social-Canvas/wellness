import "server-only"

import { syncVideoAsset } from "@/server/integrations/mux/upload"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMuxClient } from "@/server/integrations/mux/client"
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

  const syncResult = await syncVideoAsset(assetId)

  if (!syncResult.success) {
    throw new Error(syncResult.error.message)
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
