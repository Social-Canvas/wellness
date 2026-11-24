import "server-only"

import Stripe from "stripe"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentUser } from "@/features/auth/services/auth.service"
import type { AuthSessionUser } from "@/features/auth/types"
import {
  deactivatePromoCodeSchema,
  parseCreatePromoCode,
} from "@/features/promo-codes/schemas/create-promo-code"
import {
  buildCouponCreateParams,
  collectConfiguredPriceIds,
  mapPromotionCode,
  type PromoCodeListItem,
  type PromoCouponSnapshot,
} from "@/features/promo-codes/utils/promo-code-mapping"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/server/integrations/stripe/client"
import { summarizeStripeProviderError } from "@/server/integrations/stripe/mode"
import { logger, providerErrorFields } from "@/server/utils/logger"

const PROMO_CODE_LIST_LIMIT = 100

export interface PromoCodeListResult {
  items: PromoCodeListItem[]
  truncated: boolean
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

async function requireSuperAdminActor(): Promise<ActionResult<AuthSessionUser>> {
  const actorResult = await getCurrentUser()

  if (!actorResult.success) {
    return actorResult
  }

  if (actorResult.data.role !== "super_admin") {
    return failure(
      "forbidden",
      "Only a super admin can manage promo codes."
    )
  }

  return actorResult
}

function isDuplicatePromoCodeError(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) {
    return false
  }

  if (error.code === "resource_already_exists") {
    return true
  }

  return error.message.toLowerCase().includes("already exists")
}

function isMissingPromoCodeError(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  )
}

function readCoupon(
  coupon: Stripe.PromotionCode["promotion"]["coupon"]
): PromoCouponSnapshot | null {
  if (!coupon || typeof coupon === "string") {
    return null
  }

  return {
    percentOff: coupon.percent_off,
    amountOff: coupon.amount_off,
    currency: coupon.currency,
    duration: coupon.duration,
    durationInMonths: coupon.duration_in_months,
  }
}

function toListItem(promotionCode: Stripe.PromotionCode): PromoCodeListItem {
  return mapPromotionCode({
    id: promotionCode.id,
    code: promotionCode.code,
    active: promotionCode.active,
    timesRedeemed: promotionCode.times_redeemed,
    maxRedemptions: promotionCode.max_redemptions,
    expiresAt: promotionCode.expires_at,
    coupon: readCoupon(promotionCode.promotion.coupon),
  })
}

async function listEligiblePriceIds(): Promise<ActionResult<string[]>> {
  const supabase = createAdminClient()
  const [productsResult, planPricesResult] = await Promise.all([
    supabase
      .from("products")
      .select("stripe_price_id")
      .eq("status", "published")
      .eq("purchase_mode", "paid"),
    supabase
      .from("plan_prices")
      .select("stripe_price_id")
      .eq("is_active", true),
  ])

  if (productsResult.error || planPricesResult.error) {
    logger.error("[promo-codes] price lookup failed", {
      operation: "listEligiblePriceIds",
      products: productsResult.error
        ? providerErrorFields(productsResult.error)
        : null,
      planPrices: planPricesResult.error
        ? providerErrorFields(planPricesResult.error)
        : null,
    })
    return failure(
      "provider_error",
      "Product prices could not be loaded. Please try again."
    )
  }

  return success(
    collectConfiguredPriceIds([
      ...(productsResult.data ?? []).map((row) => row.stripe_price_id),
      ...(planPricesResult.data ?? []).map((row) => row.stripe_price_id),
    ])
  )
}

function productIdFromPrice(price: Stripe.Price): string | null {
  const product = price.product
  if (typeof product === "string") {
    return product
  }

  if ("deleted" in product && product.deleted) {
    return null
  }

  return product.id
}

async function resolveStripeProductIds(
  stripe: Stripe,
  priceIds: string[]
): Promise<string[]> {
  const productIds = await Promise.all(
    priceIds.map(async (priceId) => {
      const price = await stripe.prices.retrieve(priceId)
      return productIdFromPrice(price)
    })
  )

  return [...new Set(productIds.filter((id): id is string => Boolean(id)))].sort()
}

export async function listPromoCodes(): Promise<ActionResult<PromoCodeListResult>> {
  const actorResult = await requireSuperAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  try {
    const stripe = getStripeClient()
    const listed = await stripe.promotionCodes.list({
      limit: PROMO_CODE_LIST_LIMIT,
      expand: ["data.promotion.coupon"],
    })

    return success({
      items: listed.data.map(toListItem),
      truncated: listed.has_more,
    })
  } catch (caughtError) {
    logger.error("[promo-codes] list failed", {
      operation: "listPromoCodes",
      error: summarizeStripeProviderError(caughtError),
    })
    return failure(
      "provider_error",
      "Promo codes could not be loaded. Please try again."
    )
  }
}

export async function createPromoCode(
  input: unknown
): Promise<ActionResult<PromoCodeListItem>> {
  const parsed = parseCreatePromoCode(input)
  if (!parsed.success) {
    return failure("validation_error", parsed.message)
  }

  const actorResult = await requireSuperAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  const command = parsed.data

  try {
    const priceIdsResult = await listEligiblePriceIds()
    if (!priceIdsResult.success) {
      return priceIdsResult
    }

    if (priceIdsResult.data.length === 0) {
      return failure(
        "validation_error",
        "There are no active product prices to attach this code to. Publish a product with a Stripe price first."
      )
    }

    const stripe = getStripeClient()
    const existing = await stripe.promotionCodes.list({
      code: command.code,
      limit: 1,
    })

    if (existing.data.length > 0) {
      return failure(
        "validation_error",
        "That promo code already exists. Choose a different code."
      )
    }

    const productIds = await resolveStripeProductIds(stripe, priceIdsResult.data)
    if (productIds.length === 0) {
      return failure(
        "provider_error",
        "Stored prices could not be matched to Stripe products. Please try again."
      )
    }

    if (productIds.length > 100) {
      return failure(
        "validation_error",
        "There are too many active prices to attach to one promo code."
      )
    }

    const coupon = await stripe.coupons.create(
      buildCouponCreateParams(command, productIds)
    )

    try {
      const promotionCode = await stripe.promotionCodes.create({
        code: command.code,
        promotion: { type: "coupon", coupon: coupon.id },
        active: true,
        expand: ["promotion.coupon"],
        metadata: { source: "elevate_admin" },
        ...(command.maxRedemptions !== null
          ? { max_redemptions: command.maxRedemptions }
          : {}),
        ...(command.expiresAtUnix !== null
          ? { expires_at: command.expiresAtUnix }
          : {}),
      })

      logger.info("[promo-codes] created", {
        operation: "createPromoCode",
        actorProfileId: actorResult.data.id,
        code: promotionCode.code,
        promotionCodeId: promotionCode.id,
      })

      return success(toListItem(promotionCode))
    } catch (createError) {
      try {
        await stripe.coupons.del(coupon.id)
      } catch (cleanupError) {
        logger.error("[promo-codes] coupon cleanup failed", {
          operation: "createPromoCode",
          error: summarizeStripeProviderError(cleanupError),
        })
      }

      if (isDuplicatePromoCodeError(createError)) {
        return failure(
          "validation_error",
          "That promo code already exists. Choose a different code."
        )
      }

      throw createError
    }
  } catch (caughtError) {
    logger.error("[promo-codes] create failed", {
      operation: "createPromoCode",
      actorProfileId: actorResult.data.id,
      code: command.code,
      error: summarizeStripeProviderError(caughtError),
    })
    return failure(
      "provider_error",
      "The promo code could not be created. Please try again."
    )
  }
}

export async function deactivatePromoCode(
  input: unknown
): Promise<ActionResult<PromoCodeListItem>> {
  const parsed = deactivatePromoCodeSchema.safeParse(input)
  if (!parsed.success) {
    return failure(
      "validation_error",
      parsed.error.issues[0]?.message ?? "That promo code could not be turned off."
    )
  }

  const actorResult = await requireSuperAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  try {
    const stripe = getStripeClient()
    const promotionCode = await stripe.promotionCodes.update(
      parsed.data.promotionCodeId,
      { active: false, expand: ["promotion.coupon"] }
    )

    logger.info("[promo-codes] turned off", {
      operation: "deactivatePromoCode",
      actorProfileId: actorResult.data.id,
      code: promotionCode.code,
      promotionCodeId: promotionCode.id,
    })

    return success(toListItem(promotionCode))
  } catch (caughtError) {
    if (isMissingPromoCodeError(caughtError)) {
      return failure("not_found", "That promo code was not found.")
    }

    logger.error("[promo-codes] turn off failed", {
      operation: "deactivatePromoCode",
      actorProfileId: actorResult.data.id,
      promotionCodeId: parsed.data.promotionCodeId,
      error: summarizeStripeProviderError(caughtError),
    })
    return failure(
      "provider_error",
      "That promo code could not be turned off. Please try again."
    )
  }
}
