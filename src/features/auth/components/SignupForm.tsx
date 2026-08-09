"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useId, useState } from "react"
import { useForm } from "react-hook-form"

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui"
import { signUpAction } from "@/features/auth/actions/auth.actions"
import { ResendVerificationForm } from "@/features/auth/components/ResendVerificationForm"
import { signupSchema, type SignupInput } from "@/features/auth/schemas"
import { CERTIFICATE_NAME_COPY } from "@/features/auth/utils/certificate-name"

interface SignupFormProps {
  redirectTo?: string
}

export function SignupForm({ redirectTo = "/dashboard" }: SignupFormProps) {
  const router = useRouter()
  const helpId = useId()
  const confirmHelpId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      certificateName: "",
      confirmCertificateName: undefined as unknown as true,
    },
  })

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = form

  useEffect(() => {
    if (errors.certificateName) {
      setFocus("certificateName")
    } else if (errors.confirmCertificateName) {
      setFocus("confirmCertificateName")
    } else if (errors.email) {
      setFocus("email")
    } else if (errors.password) {
      setFocus("password")
    } else if (errors.confirmPassword) {
      setFocus("confirmPassword")
    }
  }, [
    errors.certificateName,
    errors.confirmCertificateName,
    errors.email,
    errors.password,
    errors.confirmPassword,
    setFocus,
  ])

  async function onSubmit(values: SignupInput) {
    setFormError(null)
    setFormSuccess(null)

    const result = await signUpAction(values)

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    if (result.data.requiresEmailConfirmation) {
      setPendingVerificationEmail(result.data.email)
      setFormSuccess(
        `Check your email to confirm your account at ${result.data.email}.`
      )
      // Preserve certificate name values after recoverable confirmation-needed state.
      return
    }

    router.push(redirectTo)
  }

  if (pendingVerificationEmail) {
    return (
      <Card className="mx-auto w-full max-w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-[23px] font-medium">
            Confirm your email
          </CardTitle>
          <CardDescription>
            We sent a confirmation link to {pendingVerificationEmail}. Click it
            once to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {formSuccess ? (
            <p
              role="status"
              className="rounded-[var(--radius-input)] border border-green/20 bg-green-soft px-3 py-2 text-sm text-green-deep"
            >
              {formSuccess}
            </p>
          ) : null}
          <ResendVerificationForm initialEmail={pendingVerificationEmail} />
        </CardContent>
      </Card>
    )
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

          <div className="space-y-2">
            <Label htmlFor="signup-certificate-name">
              {CERTIFICATE_NAME_COPY.signupLabel}
            </Label>
            <Input
              id="signup-certificate-name"
              type="text"
              autoComplete="name"
              aria-invalid={Boolean(errors.certificateName)}
              aria-describedby={helpId}
              disabled={isSubmitting}
              {...register("certificateName")}
            />
            <p id={helpId} className="text-sm text-ink-soft">
              {CERTIFICATE_NAME_COPY.signupHelp}
            </p>
            {errors.certificateName ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.certificateName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="signup-confirm-certificate-name"
              className="flex items-start gap-3 text-sm text-ink"
            >
              <input
                id="signup-confirm-certificate-name"
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-[var(--color-blue)]"
                aria-invalid={Boolean(errors.confirmCertificateName)}
                aria-describedby={confirmHelpId}
                disabled={isSubmitting}
                {...register("confirmCertificateName")}
              />
              <span id={confirmHelpId}>{CERTIFICATE_NAME_COPY.signupConfirm}</span>
            </label>
            {errors.confirmCertificateName ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.confirmCertificateName.message}
              </p>
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
              <p role="alert" className="text-sm text-destructive">
                {errors.email.message}
              </p>
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
              <p role="alert" className="text-sm text-destructive">
                {errors.password.message}
              </p>
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
              <p role="alert" className="text-sm text-destructive">
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
