"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui"
import { forgotPasswordAction } from "@/features/auth/actions/auth.actions"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/features/auth/schemas"

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null)
    setFormSuccess(null)

    const result = await forgotPasswordAction(values)

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    setFormSuccess(
      "If an account exists for this email, you will receive password reset instructions shortly."
    )
    reset()
  }

  return (
    <Card className="mx-auto w-full max-w-[400px]">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-[23px] font-medium">
          Reset your password
        </CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
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
              className="rounded-[var(--radius-input)] border border-green/20 bg-green-soft px-3 py-2 text-sm text-green-deep"
            >
              {formSuccess}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">Email</Label>
            <Input
              id="forgot-password-email"
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
            {isSubmitting ? "Sending link…" : "Send reset link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
