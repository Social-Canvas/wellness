import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { getVideo } from "@/features/videos/services/videos.service"
import { createPlaybackToken } from "@/server/integrations/mux/playback"
import { canAccessVideo } from "@/server/services/entitlement.service"

export const runtime = "nodejs"

const playbackTokenRequestSchema = z.object({
  videoId: z.uuid("Invalid video id."),
})

export async function POST(request: Request) {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return NextResponse.json({ error: profileResult.error }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid request body." } },
      { status: 400 }
    )
  }

  const parsed = playbackTokenRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: parsed.error.issues[0]?.message ?? "Invalid request body.",
        },
      },
      { status: 400 }
    )
  }

  const videoResult = await getVideo(parsed.data.videoId)

  if (!videoResult.success) {
    return NextResponse.json({ error: videoResult.error }, { status: 404 })
  }

  const video = videoResult.data

  if (video.status !== "ready" && video.status !== "published") {
    return NextResponse.json(
      {
        error: {
          code: "entitlement_required",
          message: "Video is not ready for playback.",
        },
      },
      { status: 403 }
    )
  }

  if (!video.mux_playback_id) {
    return NextResponse.json(
      {
        error: {
          code: "not_found",
          message: "Playback is not configured for this video.",
        },
      },
      { status: 404 }
    )
  }

  const accessResult = await canAccessVideo(profileResult.data.id, video.id)

  if (!accessResult.success) {
    return NextResponse.json({ error: accessResult.error }, { status: 500 })
  }

  if (!accessResult.data) {
    return NextResponse.json(
      {
        error: {
          code: "entitlement_required",
          message: "You do not have access to this video.",
        },
      },
      { status: 403 }
    )
  }

  const tokenResult = await createPlaybackToken(video.mux_playback_id)

  if (!tokenResult.success) {
    const status = tokenResult.error.code === "validation_error" ? 400 : 500
    return NextResponse.json({ error: tokenResult.error }, { status })
  }

  return NextResponse.json({ success: true, data: tokenResult.data })
}
