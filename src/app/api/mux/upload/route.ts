import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentProfile, getCurrentUser } from "@/features/auth/services/auth.service"
import { getVideo } from "@/features/videos/services/videos.service"
import { createDirectUpload } from "@/server/integrations/mux/upload"

export const runtime = "nodejs"

const uploadRequestSchema = z.object({
  videoId: z.uuid("Invalid video id."),
})

function isAdminRole(role: string): boolean {
  return role === "admin" || role === "super_admin"
}

export async function POST(request: Request) {
  const [userResult, profileResult] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ])

  if (!userResult.success || !profileResult.success) {
    return NextResponse.json(
      { error: { code: "authentication_required", message: "You must be signed in." } },
      { status: 401 }
    )
  }

  if (!isAdminRole(userResult.data.role)) {
    return NextResponse.json(
      { error: { code: "authorization_failed", message: "Admin access is required." } },
      { status: 403 }
    )
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

  const parsed = uploadRequestSchema.safeParse(body)

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

  const uploadResult = await createDirectUpload(parsed.data.videoId)

  if (!uploadResult.success) {
    const status = uploadResult.error.code === "validation_error" ? 400 : 500
    return NextResponse.json({ error: uploadResult.error }, { status })
  }

  return NextResponse.json({ success: true, data: uploadResult.data })
}
