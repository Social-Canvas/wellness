"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui"
import { signUpAction } from "@/features/auth/actions/auth.actions"
import { signupSchema, type SignupInput } from "@/features/auth/schemas"

export function SignupForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(values: SignupInput) {
    setFormError(null)
    setFormSuccess(null)

    const result = await signUpAction(values)

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    if (result.data.requiresEmailConfirmation) {
      setFormSuccess(
        `Check your email to confirm your account at ${result.data.email}.`
      )
      reset()
      return
    }

    router.push("/dashboard")
  }

  return (
    <Card className="mx-auto w-full max-w-[400px]">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-[23px] font-medium">
          Create your account
        </CardTitle>
        <CardDescription>Start your membership journey today.</CardDescription>
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
            <Label htmlFor="signup-full-name">Full name</Label>
            <Input
              id="signup-full-name"
              type="text"
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName)}
              disabled={isSubmitting}
              {...register("fullName")}
            />
            {errors.fullName ? (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
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

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
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
            <Label htmlFor="signup-confirm-password">Confirm password</Label>
            <Input
              id="signup-confirm-password"
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
