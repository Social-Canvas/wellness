import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { listPlans } from "@/features/plans/services/plans.service"
import type { BillingInterval, PlanPrice, PlanWithPrices } from "@/features/plans/types"
import {
  isProgramCatalogProductType,
  isShopCatalogProductType,
} from "@/features/shop/constants/catalog"
import { getPublishedProductDetail } from "@/features/shop/services/shop.service"
import type { ShopProductDetail } from "@/features/shop/types"
import { formatProductPrice } from "@/features/shop/utils/format-product"

import type { CheckoutConsentType } from "../utils/checkout-urls"

const planSlugSchema = z
  .string()
  .trim()
  .min(1, "Plan is required.")
  .max(120, "Plan is invalid.")

const productSlugSchema = z
  .string()
  .trim()
  .min(1, "Product is required.")
  .max(120, "Product is invalid.")

const billingIntervalSchema = z.enum(["monthly", "yearly"])

export type CheckoutConsentContext = {
  type: CheckoutConsentType
  itemName: string
  itemDescription: string | null
  priceLabel: string
  returnTo: string
  planSlug?: string
  productSlug?: string
  planPriceId?: string
  productId?: string
  interval: BillingInterval
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function resolvePlanPrice(
  plan: PlanWithPrices,
  interval: BillingInterval
): PlanPrice | undefined {
  return plan.prices.find(
    (price) => price.billing_interval === interval && price.is_active
  )
}

function formatMembershipPriceLabel(
  plan: PlanWithPrices,
  interval: BillingInterval
): string {
  const price = resolvePlanPrice(plan, interval)

  if (!price) {
    return "Monthly + annual"
  }

  const amount = formatProductPrice(price.amount, price.currency)
  const intervalLabel = interval === "monthly" ? "/mo" : "/yr"

  return `${amount}${intervalLabel}`
}

export async function resolveCheckoutConsentContext(input: {
  type: CheckoutConsentType
  planSlug?: string
  productSlug?: string
  interval?: BillingInterval
  userId?: string | null
}): Promise<ActionResult<CheckoutConsentContext>> {
  if (input.type === "membership") {
    const parsedPlanSlug = planSlugSchema.safeParse(input.planSlug)

    if (!parsedPlanSlug.success) {
      return failure("validation_error", "Select a membership plan to continue.")
    }

    const parsedInterval = billingIntervalSchema.safeParse(input.interval ?? "monthly")

    if (!parsedInterval.success) {
      return failure("validation_error", "Select a billing interval to continue.")
    }

    const plansResult = await listPlans()

    if (!plansResult.success) {
      return plansResult
    }

    const plan = plansResult.data.find(
      (entry) => entry.slug === parsedPlanSlug.data && entry.is_active
    )

    if (!plan) {
      return failure("not_found", "Membership plan not found.")
    }

    const planPrice = resolvePlanPrice(plan, parsedInterval.data)

    if (!planPrice) {
      return failure(
        "not_found",
        "This membership plan is not available for checkout yet."
      )
    }

    return {
      success: true,
      data: {
        type: "membership",
        itemName: plan.name,
        itemDescription: plan.description,
        priceLabel: formatMembershipPriceLabel(plan, parsedInterval.data),
        returnTo: "/programs",
        planSlug: plan.slug,
        planPriceId: planPrice.id,
        interval: parsedInterval.data,
      },
    }
  }

  const parsedProductSlug = productSlugSchema.safeParse(input.productSlug)

  if (!parsedProductSlug.success) {
    return failure("validation_error", "Select a product to continue.")
  }

  const productResult = await getPublishedProductDetail(
    parsedProductSlug.data,
    input.userId
  )

  if (!productResult.success) {
    return productResult
  }

  const product = productResult.data

  if (
    !isShopCatalogProductType(product.productType) &&
    !isProgramCatalogProductType(product.productType)
  ) {
    return failure("not_found", "Product not found.")
  }

  const returnTo = isShopCatalogProductType(product.productType)
    ? `/shop/${product.slug}`
    : "/programs"

  return {
    success: true,
    data: {
      type: "product",
      itemName: product.title,
      itemDescription: product.description,
      priceLabel: formatProductPrice(product.priceAmount, product.currency),
      returnTo,
      productSlug: product.slug,
      productId: product.id,
      interval: "monthly",
    },
  }
}

export function isPurchasableProduct(product: ShopProductDetail): boolean {
  return (
    isShopCatalogProductType(product.productType) ||
    isProgramCatalogProductType(product.productType)
  )
}
