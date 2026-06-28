import { NextResponse } from "next/server"

import { handleMuxWebhook } from "@/server/integrations/mux/webhook"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const payload = await request.text()
  const result = await handleMuxWebhook(payload, request.headers)

  if (result.status === "failed" && result.message.toLowerCase().includes("signature")) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }

  if (result.status === "failed") {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  return NextResponse.json({ received: true, status: result.status })
}
