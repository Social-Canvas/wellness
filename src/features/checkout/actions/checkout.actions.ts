"use server"

import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import type { ActionResult } from "@/features/auth/services/auth.service"
import { createCheckoutSession } from "@/features/billing/services/billing.service"
import { createProductCheckoutSession } from "@/features/shop/services/shop.service"

import { checkoutConsentSchema } from "../schemas/consent"
import { resolveCheckoutConsentContext } from "../services/checkout.service"

export async function proceedToCheckoutAction(
  input: unknown
): Promise<ActionResult<{ url: string }>> {
  const parsed = checkoutConsentSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return profileResult
  }

  const contextResult = await resolveCheckoutConsentContext({
    type: parsed.data.type,
    planSlug: parsed.data.planSlug,
    productSlug: parsed.data.productSlug,
    interval: parsed.data.interval,
    userId: profileResult.data.id,
  })

  if (!contextResult.success) {
    return contextResult
  }

  if (parsed.data.type === "membership") {
    if (!contextResult.data.planPriceId) {
      return {
        success: false,
        error: {
          code: "not_found",
          message: "Membership plan not found.",
        },
      }
    }

    const checkoutResult = await createCheckoutSession(
      profileResult.data.id,
      contextResult.data.planPriceId
    )

    if (!checkoutResult.success) {
      return checkoutResult
    }

    redirect(checkoutResult.data.url)
  }

  if (!contextResult.data.productId) {
    return {
      success: false,
      error: {
        code: "not_found",
        message: "Product not found.",
      },
    }
  }

  const checkoutResult = await createProductCheckoutSession(profileResult.data.id, {
    productId: contextResult.data.productId,
  })

  if (!checkoutResult.success) {
    return checkoutResult
  }

  redirect(checkoutResult.data.url)
}
