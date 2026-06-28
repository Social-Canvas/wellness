import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { generateProductDownloadUrl } from "@/features/shop/services/shop.service"

export const runtime = "nodejs"

const downloadUrlRequestSchema = z.object({
  productId: z.uuid("Invalid product id."),
  fileId: z.uuid("Invalid file id.").optional(),
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

  const parsed = downloadUrlRequestSchema.safeParse(body)

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

  const result = await generateProductDownloadUrl(profileResult.data.id, parsed.data)

  if (!result.success) {
    const status =
      result.error.code === "entitlement_required"
        ? 403
        : result.error.code === "not_found"
          ? 404
          : result.error.code === "validation_error"
            ? 400
            : 500

    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ success: true, data: result.data })
}
