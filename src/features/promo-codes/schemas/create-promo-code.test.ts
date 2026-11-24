import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import {
  createPromoCodeSchema,
  deactivatePromoCodeSchema,
  parseCreatePromoCode,
} from "./create-promo-code.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function form(overrides: Partial<{
  code: string
  discountType: "percent" | "amount"
  percentOff: string
  amountOffCents: string
  duration: "once" | "forever" | "repeating"
  durationInMonths: string
  maxRedemptions: string
  expiresOn: string
}> = {}) {
  return {
    code: "reset100",
    discountType: "percent" as const,
    percentOff: "100",
    amountOffCents: "",
    duration: "once" as const,
    durationInMonths: "",
    maxRedemptions: "",
    expiresOn: "",
    ...overrides,
  }
}

test("parseCreatePromoCode uppercases a Stripe-safe code and keeps one discount", () => {
  const parsed = parseCreatePromoCode(form({ code: "  save-10 " }))
  assert.equal(parsed.success, true)
  if (!parsed.success) {
    return
  }

  assert.equal(parsed.data.code, "SAVE-10")
  assert.equal(parsed.data.percentOff, 100)
  assert.equal(parsed.data.amountOffCents, null)
  assert.equal(parsed.data.duration, "once")
  assert.equal(parsed.data.durationInMonths, null)
  assert.equal(parsed.data.maxRedemptions, null)
  assert.equal(parsed.data.expiresAtUnix, null)
})

test("createPromoCodeSchema rejects spaces, symbols, and empty codes", () => {
  assert.equal(createPromoCodeSchema.safeParse(form({ code: "" })).success, false)
  assert.equal(createPromoCodeSchema.safeParse(form({ code: "SAVE 10" })).success, false)
  assert.equal(createPromoCodeSchema.safeParse(form({ code: "SAVE!" })).success, false)
  assert.equal(createPromoCodeSchema.safeParse(form({ code: "---" })).success, false)
})

test("createPromoCodeSchema requires percent or amount, never both", () => {
  assert.equal(
    createPromoCodeSchema.safeParse(form({ percentOff: "", amountOffCents: "" })).success,
    false
  )
  assert.equal(createPromoCodeSchema.safeParse(form({ percentOff: "0" })).success, false)
  assert.equal(createPromoCodeSchema.safeParse(form({ percentOff: "101" })).success, false)
  assert.equal(
    createPromoCodeSchema.safeParse(
      form({
        discountType: "amount",
        percentOff: "",
        amountOffCents: "1500",
      })
    ).success,
    true
  )
  assert.equal(
    createPromoCodeSchema.safeParse(
      form({
        discountType: "amount",
        percentOff: "10",
        amountOffCents: "1500",
      })
    ).success,
    false
  )
  assert.equal(
    createPromoCodeSchema.safeParse(
      form({ percentOff: "20", amountOffCents: "500" })
    ).success,
    false
  )
})

test("createPromoCodeSchema requires months only for repeating discounts", () => {
  assert.equal(
    createPromoCodeSchema.safeParse(
      form({ duration: "repeating", durationInMonths: "" })
    ).success,
    false
  )
  assert.equal(
    createPromoCodeSchema.safeParse(
      form({ duration: "repeating", durationInMonths: "3" })
    ).success,
    true
  )
  assert.equal(
    createPromoCodeSchema.safeParse(
      form({ duration: "once", durationInMonths: "3" })
    ).success,
    false
  )
  assert.equal(
    createPromoCodeSchema.safeParse(
      form({ duration: "forever", durationInMonths: "12" })
    ).success,
    false
  )
})

test("parseCreatePromoCode stores optional redemption limit and future expiry", () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const expiresOn = tomorrow.toISOString().slice(0, 10)
  const parsed = parseCreatePromoCode(
    form({
      discountType: "amount",
      percentOff: "",
      amountOffCents: "2500",
      duration: "repeating",
      durationInMonths: "2",
      maxRedemptions: "25",
      expiresOn,
    })
  )

  assert.equal(parsed.success, true)
  if (!parsed.success) {
    return
  }

  assert.equal(parsed.data.amountOffCents, 2500)
  assert.equal(parsed.data.percentOff, null)
  assert.equal(parsed.data.durationInMonths, 2)
  assert.equal(parsed.data.maxRedemptions, 25)
  assert.equal(typeof parsed.data.expiresAtUnix, "number")
})

test("createPromoCodeSchema rejects a past expiry date", () => {
  const parsed = createPromoCodeSchema.safeParse(form({ expiresOn: "2020-01-01" }))
  assert.equal(parsed.success, false)
})

test("deactivatePromoCodeSchema accepts Stripe promotion code ids only", () => {
  assert.equal(
    deactivatePromoCodeSchema.safeParse({ promotionCodeId: "promo_123ABC" }).success,
    true
  )
  assert.equal(
    deactivatePromoCodeSchema.safeParse({ promotionCodeId: "coupon_123" }).success,
    false
  )
  assert.equal(
    deactivatePromoCodeSchema.safeParse({ promotionCodeId: "price_123" }).success,
    false
  )
})

test("promo code admin is super-admin only and does not trust a client price id", () => {
  const service = readSrc("src/features/promo-codes/services/promo-codes.service.ts")
  const action = readSrc("src/features/promo-codes/actions/promo-codes.actions.ts")
  const page = readSrc("src/app/(admin)/admin/promo-codes/page.tsx")
  const sidebar = readSrc("src/features/admin/components/AdminSidebar.tsx")

  assert.match(service, /role !== "super_admin"/)
  assert.match(action, /createPromoCode\(/)
  assert.match(page, /role === "super_admin"/)
  assert.match(sidebar, /\/admin\/promo-codes/)
  assert.doesNotMatch(service, /STRIPE_SECRET_KEY/)
  assert.doesNotMatch(service, /stripePriceId/)
  assert.match(service, /from\("plan_prices"\)/)
  assert.match(service, /from\("products"\)/)
  assert.match(service, /promotionCodes\.list/)
  assert.match(service, /active: false/)
})
