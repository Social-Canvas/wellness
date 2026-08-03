import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { getRecordedSessionForPlayback } from "@/features/recorded-sessions/services/recorded-sessions.service"
import { isRecordedSessionMemberVisible } from "@/features/recorded-sessions/utils/recorded-sessions"
import { getVideo } from "@/features/videos/services/videos.service"
import { createPlaybackToken } from "@/server/integrations/mux/playback"
import {
  canAccessRecordedSessions,
  canAccessVideo,
  isVideoInPublishedLesson,
} from "@/server/services/entitlement.service"

export const runtime = "nodejs"

const playbackTokenRequestSchema = z
  .object({
    videoId: z.uuid("Invalid video id.").optional(),
    recordedSessionId: z.uuid("Invalid recorded session id.").optional(),
  })
  .refine((value) => Boolean(value.videoId) !== Boolean(value.recordedSessionId), {
    message: "Provide exactly one of videoId or recordedSessionId.",
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

  if (parsed.data.recordedSessionId) {
    const sessionResult = await getRecordedSessionForPlayback(
      parsed.data.recordedSessionId
    )

    if (!sessionResult.success) {
      return NextResponse.json({ error: sessionResult.error }, { status: 404 })
    }

    const session = sessionResult.data

    if (
      !isRecordedSessionMemberVisible({
        publicationStatus: session.publication_status,
        processingStatus: session.processing_status,
        muxPlaybackId: session.mux_playback_id,
      })
    ) {
      return NextResponse.json(
        {
          error: {
            code: "entitlement_required",
            message: "This session is not available for playback yet.",
          },
        },
        { status: 403 }
      )
    }

    if (!session.mux_playback_id) {
      return NextResponse.json(
        {
          error: {
            code: "not_found",
            message: "Playback is not configured for this session.",
          },
        },
        { status: 404 }
      )
    }

    const accessResult = await canAccessRecordedSessions(profileResult.data.id)

    if (!accessResult.success) {
      return NextResponse.json({ error: accessResult.error }, { status: 500 })
    }

    if (!accessResult.data) {
      return NextResponse.json(
        {
          error: {
            code: "entitlement_required",
            message: "You do not have access to recorded sessions.",
          },
        },
        { status: 403 }
      )
    }

    const tokenResult = await createPlaybackToken(session.mux_playback_id)

    if (!tokenResult.success) {
      const status = tokenResult.error.code === "validation_error" ? 400 : 500
      return NextResponse.json({ error: tokenResult.error }, { status })
    }

    return NextResponse.json({ success: true, data: tokenResult.data })
  }

  const videoResult = await getVideo(parsed.data.videoId!)

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

  // Defense in depth: never mint a token for a video that is not attached to a
  // fully published lesson, even for entitled or preview-authorized users.
  const publishedResult = await isVideoInPublishedLesson(video.id)

  if (!publishedResult.success) {
    return NextResponse.json({ error: publishedResult.error }, { status: 500 })
  }

  if (!publishedResult.data) {
    return NextResponse.json(
      {
        error: {
          code: "entitlement_required",
          message: "This video is not available for playback yet.",
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
