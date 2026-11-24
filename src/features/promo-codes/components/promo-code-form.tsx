"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button, Input, Label } from "@/components/ui"
import { createPromoCodeAction } from "@/features/promo-codes/actions/promo-codes.actions"
import {
  createPromoCodeSchema,
  type CreatePromoCodeFormValues,
} from "@/features/promo-codes/schemas/create-promo-code"

const selectClassName =
  "h-auto min-h-10 w-full rounded-[var(--radius-input)] border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const emptyForm: CreatePromoCodeFormValues = {
  code: "",
  discountType: "percent",
  percentOff: "",
  amountOffCents: "",
  duration: "once",
  durationInMonths: "",
  maxRedemptions: "",
  expiresOn: "",
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null
  }

  return <p className="mt-1 text-sm text-destructive">{message}</p>
}

export function PromoCodeForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePromoCodeFormValues>({
    resolver: zodResolver(createPromoCodeSchema),
    defaultValues: emptyForm,
  })

  const discountTypeField = register("discountType")
  const durationField = register("duration")

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setFormSuccess(null)
    const result = await createPromoCodeAction(values)

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    reset(emptyForm)
    setFormSuccess(
      `Created ${result.data.code}. Customers can enter it when they buy a product.`
    )
    router.refresh()
  })

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-line bg-surface px-5 py-5"
      noValidate
    >
      <div>
        <h3 className="font-display text-lg text-ink">Create a promo code</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Letters, numbers, and dashes. The code is saved in capitals.
        </p>
      </div>

      <div>
        <Label htmlFor="promo-code">Code</Label>
        <Input
          id="promo-code"
          autoComplete="off"
          autoCapitalize="characters"
          className="mt-2"
          aria-invalid={errors.code ? true : undefined}
          {...register("code")}
        />
        <FieldError message={errors.code?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="promo-discount-type">Discount</Label>
          <select
            id="promo-discount-type"
            className={`${selectClassName} mt-2`}
            {...discountTypeField}
            onChange={(event) => {
              void discountTypeField.onChange(event)
              if (event.target.value === "amount") {
                setValue("percentOff", "")
              } else {
                setValue("amountOffCents", "")
              }
            }}
          >
            <option value="percent">Percent off</option>
            <option value="amount">Fixed amount (cents)</option>
          </select>
        </div>

        <div>
          <Label htmlFor="promo-percent">Percent off</Label>
          <Input
            id="promo-percent"
            inputMode="numeric"
            className="mt-2"
            placeholder="20"
            aria-invalid={errors.percentOff ? true : undefined}
            {...register("percentOff")}
          />
          <p className="mt-1 text-sm text-ink-soft">
            Whole number from 1 to 100. Leave blank if you use a fixed amount.
          </p>
          <FieldError message={errors.percentOff?.message} />
        </div>

        <div>
          <Label htmlFor="promo-amount">Amount off in cents</Label>
          <Input
            id="promo-amount"
            inputMode="numeric"
            className="mt-2"
            placeholder="1500"
            aria-invalid={errors.amountOffCents ? true : undefined}
            {...register("amountOffCents")}
          />
          <p className="mt-1 text-sm text-ink-soft">
            1500 means $15.00 off. Leave blank if you use a percent.
          </p>
          <FieldError message={errors.amountOffCents?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="promo-duration">How long it lasts</Label>
          <select
            id="promo-duration"
            className={`${selectClassName} mt-2`}
            {...durationField}
            onChange={(event) => {
              void durationField.onChange(event)
              if (event.target.value !== "repeating") {
                setValue("durationInMonths", "")
              }
            }}
          >
            <option value="once">Once</option>
            <option value="forever">Forever</option>
            <option value="repeating">Repeating</option>
          </select>
          <FieldError message={errors.duration?.message} />
        </div>

        <div>
          <Label htmlFor="promo-months">Months</Label>
          <Input
            id="promo-months"
            inputMode="numeric"
            className="mt-2"
            placeholder="3"
            aria-invalid={errors.durationInMonths ? true : undefined}
            {...register("durationInMonths")}
          />
          <p className="mt-1 text-sm text-ink-soft">
            Required when the discount repeats. Leave blank otherwise.
          </p>
          <FieldError message={errors.durationInMonths?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="promo-max">Maximum uses</Label>
          <Input
            id="promo-max"
            inputMode="numeric"
            className="mt-2"
            placeholder="Optional"
            aria-invalid={errors.maxRedemptions ? true : undefined}
            {...register("maxRedemptions")}
          />
          <p className="mt-1 text-sm text-ink-soft">Leave blank for no limit.</p>
          <FieldError message={errors.maxRedemptions?.message} />
        </div>

        <div>
          <Label htmlFor="promo-expiry">Expiry date</Label>
          <Input
            id="promo-expiry"
            type="date"
            className="mt-2"
            aria-invalid={errors.expiresOn ? true : undefined}
            {...register("expiresOn")}
          />
          <p className="mt-1 text-sm text-ink-soft">
            Optional. The code stops at the end of this date (UTC).
          </p>
          <FieldError message={errors.expiresOn?.message} />
        </div>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
      {formSuccess ? <p className="text-sm text-green-deep">{formSuccess}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create promo code"}
      </Button>
    </form>
  )
}
