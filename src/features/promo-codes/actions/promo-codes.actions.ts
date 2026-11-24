"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type { CreatePromoCodeFormValues } from "@/features/promo-codes/schemas/create-promo-code"
import {
  createPromoCode,
  deactivatePromoCode,
} from "@/features/promo-codes/services/promo-codes.service"
import type { PromoCodeListItem } from "@/features/promo-codes/utils/promo-code-mapping"

function revalidatePromoCodes() {
  revalidatePath("/admin/promo-codes")
}

export async function createPromoCodeAction(
  input: CreatePromoCodeFormValues
): Promise<ActionResult<PromoCodeListItem>> {
  const result = await createPromoCode(input)

  if (result.success) {
    revalidatePromoCodes()
  }

  return result
}

export async function deactivatePromoCodeAction(
  promotionCodeId: string
): Promise<ActionResult<PromoCodeListItem>> {
  const result = await deactivatePromoCode({ promotionCodeId })

  if (result.success) {
    revalidatePromoCodes()
  }

  return result
}
