import { NextResponse } from "next/server"

import { handleStripeWebhook } from "@/server/integrations/stripe/webhook"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")
  const result = await handleStripeWebhook(payload, signature)

  if (result.status === "failed" && result.message.includes("signature")) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }

  if (result.status === "failed") {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  return NextResponse.json({ received: true, status: result.status })
}
