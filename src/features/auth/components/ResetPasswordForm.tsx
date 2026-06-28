"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui"
import { resetPasswordAction } from "@/features/auth/actions/auth.actions"
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas"

export function ResetPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null)
    setFormSuccess(null)

    const result = await resetPasswordAction(values)

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    setFormSuccess("Your password has been updated. You can sign in with your new password.")
    reset()
  }

  return (
    <Card className="mx-auto w-full max-w-[400px]">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-[23px] font-medium">
          Choose a new password
        </CardTitle>
        <CardDescription>Enter and confirm your new password below.</CardDescription>
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
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              disabled={isSubmitting}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">Confirm new password</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              disabled={isSubmitting}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="block" disabled={isSubmitting}>
            {isSubmitting ? "Updating password…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
