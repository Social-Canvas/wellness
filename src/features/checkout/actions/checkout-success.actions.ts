"use server"

import { z } from "zod"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCheckoutFulfillmentStatus } from "@/features/checkout/services/checkout-success.service"

const sessionIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^cs_/)

export async function pollCheckoutFulfillmentAction(
  sessionId: string
): Promise<
  ActionResult<{
    state: "fulfilled" | "processing" | "invalid"
    accessReady: boolean
    destinationHref: string | null
  }>
> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return {
      success: false,
      error: { code: "unauthorized", message: "Sign in to check checkout status." },
    }
  }

  const parsed = sessionIdSchema.safeParse(sessionId)

  if (!parsed.success) {
    return {
      success: true,
      data: { state: "invalid", accessReady: false, destinationHref: null },
    }
  }

  return getCheckoutFulfillmentStatus(profileResult.data.id, parsed.data)
}
