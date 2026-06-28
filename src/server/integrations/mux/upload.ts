import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type { Video } from "@/features/videos/types"
import {
  attachMuxAsset,
  getVideoByMuxAssetId,
  updateProcessingStatus,
} from "@/features/videos/services/videos.service"
import { env } from "@/lib/config"
import { getMuxClient } from "@/server/integrations/mux/client"

export type DirectUploadResult = {
  uploadId: string
  url: string
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function getSignedPlaybackId(asset: {
  playback_ids?: Array<{ id: string; policy?: string }> | null
}): string | null {
  const playbackIds = asset.playback_ids ?? []
  const signedPlayback = playbackIds.find((playback) => playback.policy === "signed")

  return signedPlayback?.id ?? playbackIds[0]?.id ?? null
}

function parsePassthroughVideoId(passthrough: string | null | undefined): string | null {
  if (!passthrough) {
    return null
  }

  try {
    const parsed = JSON.parse(passthrough) as { video_id?: string }

    return typeof parsed.video_id === "string" ? parsed.video_id : null
  } catch {
    return passthrough
  }
}

export async function createDirectUpload(
  videoId: string
): Promise<ActionResult<DirectUploadResult>> {
  try {
    const mux = getMuxClient()
    const upload = await mux.video.uploads.create({
      cors_origin: env.NEXT_PUBLIC_APP_URL,
      new_asset_settings: {
        playback_policy: ["signed"],
        passthrough: JSON.stringify({ video_id: videoId }),
      },
    })

    if (!upload.url) {
      return failure("provider_error", "Mux did not return an upload URL.")
    }

    const processingResult = await updateProcessingStatus(videoId, {
      status: "uploading",
      migrationStatus: "uploaded",
    })

    if (!processingResult.success) {
      return processingResult
    }

    return success({
      uploadId: upload.id,
      url: upload.url,
    })
  } catch {
    return failure("provider_error", "Unable to create Mux direct upload.")
  }
}

export async function syncVideoAsset(assetId: string): Promise<ActionResult<Video>> {
  if (!assetId.trim()) {
    return failure("validation_error", "Mux asset ID is required.")
  }

  try {
    const mux = getMuxClient()
    const asset = await mux.video.assets.retrieve(assetId)
    const playbackId = getSignedPlaybackId(asset)
    const passthroughVideoId = parsePassthroughVideoId(asset.passthrough)

    const existingVideoResult = await getVideoByMuxAssetId(asset.id)

    let video: Video

    if (existingVideoResult.success) {
      video = existingVideoResult.data
    } else if (passthroughVideoId) {
      const attachResult = await attachMuxAsset(
        passthroughVideoId,
        asset.id,
        playbackId
      )

      if (!attachResult.success) {
        return attachResult
      }

      video = attachResult.data
    } else {
      return failure("not_found", "Video not found for Mux asset.")
    }

    if (asset.status === "errored") {
      return updateProcessingStatus(video.id, {
        status: "failed",
        migrationStatus: "failed",
        muxAssetId: asset.id,
        muxPlaybackId: playbackId,
      })
    }

    if (asset.status === "ready") {
      const durationSeconds =
        typeof asset.duration === "number" ? Math.round(asset.duration) : null
      const thumbnailUrl = playbackId
        ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
        : null

      return updateProcessingStatus(video.id, {
        status: "ready",
        migrationStatus: "verified",
        durationSeconds,
        thumbnailUrl,
        muxAssetId: asset.id,
        muxPlaybackId: playbackId,
      })
    }

    return updateProcessingStatus(video.id, {
      status: "processing",
      migrationStatus: "uploaded",
      muxAssetId: asset.id,
      muxPlaybackId: playbackId,
    })
  } catch {
    return failure("provider_error", "Unable to sync Mux asset.")
  }
}
