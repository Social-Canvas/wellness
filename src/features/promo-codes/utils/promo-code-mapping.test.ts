import assert from "node:assert/strict"
import test from "node:test"

import { isConfiguredStripePriceId } from "../../../server/integrations/stripe/mode.ts"
import type { CreatePromoCodeCommand } from "../schemas/create-promo-code.ts"
import {
  buildCouponCreateParams,
  collectConfiguredPriceIds,
  isCatalogStripePriceId,
  mapPromotionCode,
  type PromoCouponSnapshot,
} from "./promo-code-mapping.ts"

const percentCoupon: PromoCouponSnapshot = {
  percentOff: 25,
  amountOff: null,
  currency: null,
  duration: "once",
  durationInMonths: null,
}

function command(
  overrides: Partial<CreatePromoCodeCommand> = {}
): CreatePromoCodeCommand {
  return {
    code: "RESET100",
    discountType: "percent",
    percentOff: 100,
    amountOffCents: null,
    duration: "once",
    durationInMonths: null,
    maxRedemptions: null,
    expiresAtUnix: null,
    ...overrides,
  }
}

test("catalog price ids match the shared Stripe price helper", () => {
  const samples = [
    "price_1ABC",
    "price_placeholder_7_day_reset",
    "price_",
    "not_a_price",
    "price_product_reset",
  ]

  for (const sample of samples) {
    assert.equal(isCatalogStripePriceId(sample), isConfiguredStripePriceId(sample))
  }
})

test("collectConfiguredPriceIds keeps real price ids and drops placeholders", () => {
  assert.deepEqual(
    collectConfiguredPriceIds([
      null,
      undefined,
      "",
      "price_placeholder_7_day_reset",
      "price_product_reset",
      "price_product_reset",
      "not_a_price",
      "price_plan_core",
    ]),
    ["price_plan_core", "price_product_reset"]
  )
})

test("mapPromotionCode formats percent, amount, duration, uses, and expiry", () => {
  const percent = mapPromotionCode({
    id: "promo_percent",
    code: "SAVE25",
    active: true,
    timesRedeemed: 2,
    maxRedemptions: 10,
    expiresAt: null,
    coupon: percentCoupon,
  })
  assert.equal(percent.discountLabel, "25% off")
  assert.equal(percent.durationLabel, "Once")
  assert.equal(percent.redemptionLabel, "2 of 10")
  assert.equal(percent.expiresLabel, "No expiry")
  assert.equal(percent.active, true)

  const amount = mapPromotionCode({
    id: "promo_amount",
    code: "TAKE15",
    active: false,
    timesRedeemed: 4,
    maxRedemptions: null,
    expiresAt: Math.floor(Date.UTC(2026, 11, 31, 23, 59, 59) / 1000),
    coupon: {
      percentOff: null,
      amountOff: 1500,
      currency: "usd",
      duration: "repeating",
      durationInMonths: 3,
    },
  })
  assert.equal(amount.discountLabel, "$15.00 off")
  assert.equal(amount.durationLabel, "3 months")
  assert.equal(amount.redemptionLabel, "4")
  assert.equal(amount.expiresLabel, "Dec 31, 2026")
  assert.equal(amount.active, false)

  const forever = mapPromotionCode({
    id: "promo_forever",
    code: "ALWAYS",
    active: true,
    timesRedeemed: 0,
    maxRedemptions: null,
    expiresAt: null,
    coupon: {
      percentOff: 10,
      amountOff: null,
      currency: null,
      duration: "forever",
      durationInMonths: null,
    },
  })
  assert.equal(forever.durationLabel, "Forever")

  const oneMonth = mapPromotionCode({
    id: "promo_month",
    code: "MONTH",
    active: true,
    timesRedeemed: 0,
    maxRedemptions: null,
    expiresAt: null,
    coupon: {
      percentOff: null,
      amountOff: null,
      currency: null,
      duration: "repeating",
      durationInMonths: 1,
    },
  })
  assert.equal(oneMonth.discountLabel, "Discount")
  assert.equal(oneMonth.durationLabel, "1 month")
})

test("buildCouponCreateParams limits the coupon to looked-up products", () => {
  const percent = buildCouponCreateParams(command(), [
    "prod_reset",
    "prod_core",
  ])
  assert.equal(percent.percent_off, 100)
  assert.equal(percent.amount_off, undefined)
  assert.equal(percent.currency, undefined)
  assert.deepEqual(percent.applies_to.products, ["prod_core", "prod_reset"])
  assert.equal("id" in percent, false)

  const amount = buildCouponCreateParams(
    command({
      discountType: "amount",
      percentOff: null,
      amountOffCents: 2500,
      duration: "repeating",
      durationInMonths: 2,
      maxRedemptions: 25,
      expiresAtUnix: 1_800_000_000,
    }),
    ["prod_reset"]
  )
  assert.equal(amount.amount_off, 2500)
  assert.equal(amount.currency, "usd")
  assert.equal(amount.percent_off, undefined)
  assert.equal(amount.duration_in_months, 2)
  assert.equal(amount.max_redemptions, 25)
  assert.equal(amount.redeem_by, 1_800_000_000)
  assert.deepEqual(amount.applies_to.products, ["prod_reset"])
})
