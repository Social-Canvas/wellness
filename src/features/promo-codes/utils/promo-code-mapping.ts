import type { CreatePromoCodeCommand } from "../schemas/create-promo-code"

/**
 * Same rule as `isConfiguredStripePriceId`. Kept local so Node tests can load
 * this file without a path-alias import.
 */
export function isCatalogStripePriceId(priceId: string): boolean {
  if (!priceId.startsWith("price_")) {
    return false
  }

  if (priceId.startsWith("price_placeholder_")) {
    return false
  }

  return priceId.length > "price_".length
}

export interface PromoCouponSnapshot {
  percentOff: number | null
  amountOff: number | null
  currency: string | null
  duration: "once" | "forever" | "repeating"
  durationInMonths: number | null
}

export interface PromoCodeRecord {
  id: string
  code: string
  active: boolean
  timesRedeemed: number
  maxRedemptions: number | null
  expiresAt: number | null
  coupon: PromoCouponSnapshot | null
}

export interface PromoCodeListItem {
  id: string
  code: string
  discountLabel: string
  durationLabel: string
  redemptionLabel: string
  active: boolean
  expiresLabel: string
}

export interface CouponCreatePayload {
  name: string
  duration: "once" | "forever" | "repeating"
  duration_in_months?: number
  percent_off?: number
  amount_off?: number
  currency?: string
  max_redemptions?: number
  redeem_by?: number
  applies_to: { products: string[] }
  metadata: { source: "elevate_admin" }
}

export function collectConfiguredPriceIds(
  priceIds: Array<string | null | undefined>
): string[] {
  const unique = new Set<string>()

  for (const priceId of priceIds) {
    if (!priceId || !isCatalogStripePriceId(priceId)) {
      continue
    }
    unique.add(priceId)
  }

  return [...unique].sort()
}

export function formatAmountOff(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100)
  } catch {
    return `${amountCents} ${currency.toUpperCase()}`
  }
}

export function formatPromoDiscount(coupon: PromoCouponSnapshot | null): string {
  if (!coupon) {
    return "Discount"
  }

  if (coupon.percentOff !== null) {
    return `${coupon.percentOff}% off`
  }

  if (coupon.amountOff !== null) {
    return `${formatAmountOff(coupon.amountOff, coupon.currency ?? "usd")} off`
  }

  return "Discount"
}

export function formatPromoDuration(coupon: PromoCouponSnapshot | null): string {
  if (!coupon) {
    return "Unknown"
  }

  if (coupon.duration === "once") {
    return "Once"
  }

  if (coupon.duration === "forever") {
    return "Forever"
  }

  if (coupon.durationInMonths === 1) {
    return "1 month"
  }

  if (coupon.durationInMonths !== null && coupon.durationInMonths > 1) {
    return `${coupon.durationInMonths} months`
  }

  return "Repeating"
}

export function formatRedemptionCount(
  timesRedeemed: number,
  maxRedemptions: number | null
): string {
  if (maxRedemptions === null) {
    return String(timesRedeemed)
  }

  return `${timesRedeemed} of ${maxRedemptions}`
}

export function formatPromoExpiry(expiresAtUnix: number | null): string {
  if (expiresAtUnix === null) {
    return "No expiry"
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(expiresAtUnix * 1000))
}

export function mapPromotionCode(record: PromoCodeRecord): PromoCodeListItem {
  return {
    id: record.id,
    code: record.code,
    discountLabel: formatPromoDiscount(record.coupon),
    durationLabel: formatPromoDuration(record.coupon),
    redemptionLabel: formatRedemptionCount(
      record.timesRedeemed,
      record.maxRedemptions
    ),
    active: record.active,
    expiresLabel: formatPromoExpiry(record.expiresAt),
  }
}

export function buildCouponCreateParams(
  command: CreatePromoCodeCommand,
  productIds: string[]
): CouponCreatePayload {
  const payload: CouponCreatePayload = {
    name: command.code,
    duration: command.duration,
    applies_to: { products: [...productIds].sort() },
    metadata: { source: "elevate_admin" },
  }

  if (command.discountType === "percent" && command.percentOff !== null) {
    payload.percent_off = command.percentOff
  }

  if (command.discountType === "amount" && command.amountOffCents !== null) {
    payload.amount_off = command.amountOffCents
    payload.currency = "usd"
  }

  if (command.duration === "repeating" && command.durationInMonths !== null) {
    payload.duration_in_months = command.durationInMonths
  }

  if (command.maxRedemptions !== null) {
    payload.max_redemptions = command.maxRedemptions
  }

  if (command.expiresAtUnix !== null) {
    payload.redeem_by = command.expiresAtUnix
  }

  return payload
}
