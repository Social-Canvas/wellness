"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button, Input, Label } from "@/components/ui"
import { resendVerificationAction } from "@/features/auth/actions/auth.actions"
import {
  resendVerificationSchema,
  type ResendVerificationInput,
} from "@/features/auth/schemas"

type ResendVerificationFormProps = {
  initialEmail?: string
}

export function ResendVerificationForm({
  initialEmail = "",
}: ResendVerificationFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const form = useForm<ResendVerificationInput>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: {
      email: initialEmail,
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(values: ResendVerificationInput) {
    setFormError(null)
    setFormSuccess(null)

    const result = await resendVerificationAction(values)

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    setFormSuccess(
      "If that email needs verification, we sent a new confirmation link."
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError ? (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      {formSuccess ? (
        <p
          role="status"
          className="rounded-[var(--radius-input)] border border-line bg-cream2 px-3 py-2 text-sm text-ink"
        >
          {formSuccess}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="resend-verification-email">Email</Label>
        <Input
          id="resend-verification-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          disabled={isSubmitting}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <Button type="submit" size="block" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send new verification"}
      </Button>
    </form>
  )
}
