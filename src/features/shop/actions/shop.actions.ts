"use server"

import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  createProductCheckoutSchema,
  type CreateProductCheckoutInput,
} from "@/features/shop/schemas"
import { createProductCheckoutSession } from "@/features/shop/services/shop.service"
import type { ProductCheckoutResult } from "@/features/shop/types"

export async function createProductCheckoutAction(
  input: CreateProductCheckoutInput
): Promise<ActionResult<ProductCheckoutResult>> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return profileResult
  }

  const parsed = createProductCheckoutSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  const result = await createProductCheckoutSession(profileResult.data.id, parsed.data)

  if (result.success) {
    redirect(result.data.url)
  }

  return result
}
