import { z } from "zod"

const PROMO_CODE_MAX_LENGTH = 40
const PROMO_CODE_CHARSET = /^[A-Z0-9-]+$/
const EXPIRY_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const PERCENT_MIN = 1
const PERCENT_MAX = 100
const AMOUNT_MAX_CENTS = 10_000_000
const MONTHS_MAX = 36
const REDEMPTIONS_MAX = 1_000_000

function normalizePromoCode(value: string): string {
  return value.trim().toUpperCase()
}

function isStripeSafePromoCode(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= PROMO_CODE_MAX_LENGTH &&
    PROMO_CODE_CHARSET.test(value) &&
    /[A-Z0-9]/.test(value)
  )
}

function readWholeNumber(value: string): number | null | "invalid" {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (!/^\d+$/.test(trimmed)) {
    return "invalid"
  }

  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed)) {
    return "invalid"
  }

  return parsed
}

function promoExpiryUnixSeconds(
  expiresOn: string,
  now: Date
): { ok: true; unix: number } | { ok: false; message: string } {
  const match = EXPIRY_DATE.exec(expiresOn.trim())
  if (!match) {
    return { ok: false, message: "Enter a valid expiry date." }
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const calendar = new Date(Date.UTC(year, month - 1, day))
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    return { ok: false, message: "Enter a valid expiry date." }
  }

  const expiresAt = Date.UTC(year, month - 1, day, 23, 59, 59)
  if (expiresAt <= now.getTime()) {
    return {
      ok: false,
      message: "Choose an expiry date that is still in the future.",
    }
  }

  const latest = new Date(now.getTime())
  latest.setUTCFullYear(latest.getUTCFullYear() + 5)
  if (expiresAt > latest.getTime()) {
    return {
      ok: false,
      message: "Choose an expiry date within the next 5 years.",
    }
  }

  return { ok: true, unix: Math.floor(expiresAt / 1000) }
}

export const createPromoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Enter a code customers will type.")
      .max(40, "Use 40 characters or fewer."),
    discountType: z.enum(["percent", "amount"], {
      message: "Choose percent off or a fixed amount.",
    }),
    percentOff: z.string(),
    amountOffCents: z.string(),
    duration: z.enum(["once", "forever", "repeating"], {
      message: "Choose how long the discount lasts.",
    }),
    durationInMonths: z.string(),
    maxRedemptions: z.string(),
    expiresOn: z.string(),
  })
  .superRefine((value, ctx) => {
    const code = normalizePromoCode(value.code)
    if (!isStripeSafePromoCode(code)) {
      ctx.addIssue({
        code: "custom",
        path: ["code"],
        message: "Use letters, numbers, and dashes only.",
      })
    }

    const percentOff = readWholeNumber(value.percentOff)
    const amountOffCents = readWholeNumber(value.amountOffCents)

    if (percentOff === "invalid") {
      ctx.addIssue({
        code: "custom",
        path: ["percentOff"],
        message: "Enter a whole percent from 1 to 100.",
      })
    }

    if (amountOffCents === "invalid") {
      ctx.addIssue({
        code: "custom",
        path: ["amountOffCents"],
        message: "Enter the amount off as a whole number of cents.",
      })
    }

    if (value.discountType === "percent") {
      if (amountOffCents !== null && amountOffCents !== "invalid") {
        ctx.addIssue({
          code: "custom",
          path: ["amountOffCents"],
          message: "Choose either a percent off or a fixed amount, not both.",
        })
      }

      if (percentOff === null) {
        ctx.addIssue({
          code: "custom",
          path: ["percentOff"],
          message: "Enter a percent from 1 to 100.",
        })
      } else if (
        percentOff !== "invalid" &&
        (percentOff < PERCENT_MIN || percentOff > PERCENT_MAX)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["percentOff"],
          message: "Enter a percent from 1 to 100.",
        })
      }
    }

    if (value.discountType === "amount") {
      if (percentOff !== null && percentOff !== "invalid") {
        ctx.addIssue({
          code: "custom",
          path: ["percentOff"],
          message: "Choose either a percent off or a fixed amount, not both.",
        })
      }

      if (amountOffCents === null) {
        ctx.addIssue({
          code: "custom",
          path: ["amountOffCents"],
          message: "Enter the amount off in cents. 1500 means $15.00 off.",
        })
      } else if (
        amountOffCents !== "invalid" &&
        (amountOffCents < 1 || amountOffCents > AMOUNT_MAX_CENTS)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["amountOffCents"],
          message: "Enter an amount off from 1 cent up to $100,000.",
        })
      }
    }

    const durationInMonths = readWholeNumber(value.durationInMonths)
    if (durationInMonths === "invalid") {
      ctx.addIssue({
        code: "custom",
        path: ["durationInMonths"],
        message: "Enter a whole number of months.",
      })
    } else if (value.duration === "repeating") {
      if (durationInMonths === null) {
        ctx.addIssue({
          code: "custom",
          path: ["durationInMonths"],
          message: "Enter how many months the discount repeats.",
        })
      } else if (durationInMonths < 1 || durationInMonths > MONTHS_MAX) {
        ctx.addIssue({
          code: "custom",
          path: ["durationInMonths"],
          message: "Enter between 1 and 36 months.",
        })
      }
    } else if (durationInMonths !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["durationInMonths"],
        message: "Months are only used when the discount repeats.",
      })
    }

    const maxRedemptions = readWholeNumber(value.maxRedemptions)
    if (maxRedemptions === "invalid") {
      ctx.addIssue({
        code: "custom",
        path: ["maxRedemptions"],
        message: "Enter a whole number for the maximum uses.",
      })
    } else if (
      maxRedemptions !== null &&
      (maxRedemptions < 1 || maxRedemptions > REDEMPTIONS_MAX)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxRedemptions"],
        message: "Enter a maximum between 1 and 1,000,000.",
      })
    }

    const expiresOn = value.expiresOn.trim()
    if (expiresOn) {
      const expiry = promoExpiryUnixSeconds(expiresOn, new Date())
      if (!expiry.ok) {
        ctx.addIssue({
          code: "custom",
          path: ["expiresOn"],
          message: expiry.message,
        })
      }
    }
  })

export type CreatePromoCodeFormValues = z.input<typeof createPromoCodeSchema>

export const deactivatePromoCodeSchema = z.object({
  promotionCodeId: z
    .string()
    .regex(/^promo_[A-Za-z0-9]+$/, "That promo code could not be turned off."),
})

export type DeactivatePromoCodeInput = z.infer<typeof deactivatePromoCodeSchema>

export interface CreatePromoCodeCommand {
  code: string
  discountType: "percent" | "amount"
  percentOff: number | null
  amountOffCents: number | null
  duration: "once" | "forever" | "repeating"
  durationInMonths: number | null
  maxRedemptions: number | null
  expiresAtUnix: number | null
}

function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Check the promo code form and try again."
}

export function parseCreatePromoCode(
  input: unknown,
  now = new Date()
):
  | { success: true; data: CreatePromoCodeCommand }
  | { success: false; message: string } {
  const parsed = createPromoCodeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: firstIssueMessage(parsed.error) }
  }

  const value = parsed.data
  const percentOff = readWholeNumber(value.percentOff)
  const amountOffCents = readWholeNumber(value.amountOffCents)
  const durationInMonths = readWholeNumber(value.durationInMonths)
  const maxRedemptions = readWholeNumber(value.maxRedemptions)
  const expiresOn = value.expiresOn.trim()

  if (
    percentOff === "invalid" ||
    amountOffCents === "invalid" ||
    durationInMonths === "invalid" ||
    maxRedemptions === "invalid"
  ) {
    return { success: false, message: "Check the promo code form and try again." }
  }

  let expiresAtUnix: number | null = null
  if (expiresOn) {
    const expiry = promoExpiryUnixSeconds(expiresOn, now)
    if (!expiry.ok) {
      return { success: false, message: expiry.message }
    }
    expiresAtUnix = expiry.unix
  }

  return {
    success: true,
    data: {
      code: normalizePromoCode(value.code),
      discountType: value.discountType,
      percentOff: value.discountType === "percent" ? percentOff : null,
      amountOffCents: value.discountType === "amount" ? amountOffCents : null,
      duration: value.duration,
      durationInMonths: value.duration === "repeating" ? durationInMonths : null,
      maxRedemptions,
      expiresAtUnix,
    },
  }
}
