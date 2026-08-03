"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  claimFreeDigitalProductSchema,
  createProductCheckoutSchema,
  type ClaimFreeDigitalProductInput,
  type CreateProductCheckoutInput,
} from "@/features/shop/schemas"
import {
  claimFreeDigitalProduct,
  createProductCheckoutSession,
} from "@/features/shop/services/shop.service"
import type { FreeClaimResult, ProductCheckoutResult } from "@/features/shop/types"
import { EBOOK_DOWNLOADS_PATH } from "@/features/shop/utils/ebook-delivery"

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

export async function claimFreeDigitalProductAction(
  input: ClaimFreeDigitalProductInput
): Promise<ActionResult<FreeClaimResult>> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return profileResult
  }

  const parsed = claimFreeDigitalProductSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  const result = await claimFreeDigitalProduct(profileResult.data.id, parsed.data)

  if (result.success) {
    revalidatePath(EBOOK_DOWNLOADS_PATH)
    revalidatePath(`/shop/${parsed.data.productSlug}`)
    redirect(result.data.destination)
  }

  return result
}
