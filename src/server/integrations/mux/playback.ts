import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getMuxClient } from "@/server/integrations/mux/client"

const PLAYBACK_TOKEN_EXPIRATION = "15m"

export type PlaybackTokenResult = {
  token: string
  playbackId: string
  expiresIn: string
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

export async function createPlaybackToken(
  playbackId: string
): Promise<ActionResult<PlaybackTokenResult>> {
  if (!playbackId.trim()) {
    return failure("validation_error", "Playback ID is required.")
  }

  try {
    const mux = getMuxClient()
    const token = await mux.jwt.signPlaybackId(playbackId, {
      type: "video",
      expiration: PLAYBACK_TOKEN_EXPIRATION,
    })

    return success({
      token,
      playbackId,
      expiresIn: PLAYBACK_TOKEN_EXPIRATION,
    })
  } catch {
    return failure("provider_error", "Unable to create playback token.")
  }
}
