"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useId, useState } from "react"
import { useForm } from "react-hook-form"

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui"
import { setCertificateNameOnceAction } from "@/features/auth/actions/certificate-name.actions"
import { signOutAction } from "@/features/auth/actions/auth.actions"
import {
  setCertificateNameOnceSchema,
  type SetCertificateNameOnceInput,
} from "@/features/auth/schemas"
import {
  CERTIFICATE_NAME_COPY,
  normalizeCertificateName,
  resolveCertificateNameNextPath,
} from "@/features/auth/utils/certificate-name"

type CertificateNameOnboardingFormProps = {
  nextPath?: string
}

export function CertificateNameOnboardingForm({
  nextPath,
}: CertificateNameOnboardingFormProps) {
  const router = useRouter()
  const nameDescribedBy = useId()
  const previewDescribedBy = useId()
  const confirmDescribedBy = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState("")

  const form = useForm<SetCertificateNameOnceInput>({
    resolver: zodResolver(setCertificateNameOnceSchema),
    defaultValues: {
      certificateName: "",
      confirmSpelling: undefined as unknown as true,
      source: "onboarding",
    },
  })

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = form

  const { ref: certificateNameRef, ...certificateNameRegister } =
    register("certificateName", {
      onChange: (event) => {
        setPreviewName(normalizeCertificateName(event.target.value || ""))
      },
    })

  useEffect(() => {
    if (errors.certificateName) {
      setFocus("certificateName")
    } else if (errors.confirmSpelling) {
      setFocus("confirmSpelling")
    }
  }, [errors.certificateName, errors.confirmSpelling, setFocus])

  async function onSubmit(values: SetCertificateNameOnceInput) {
    setFormError(null)
    setFormSuccess(null)

    const result = await setCertificateNameOnceAction({
      ...values,
      source: "onboarding",
    })

    if (!result.success) {
      setFormError(result.error.message)
      setFocus("certificateName")
      return
    }

    setFormSuccess("Certificate name confirmed.")
    router.push(resolveCertificateNameNextPath(nextPath))
    router.refresh()
  }

  async function onLogout() {
    await signOutAction()
  }

  return (
    <Card className="mx-auto w-full max-w-[440px]">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-[23px] font-medium">
          {CERTIFICATE_NAME_COPY.onboardingHeading}
        </CardTitle>
        <CardDescription id={nameDescribedBy}>
          {CERTIFICATE_NAME_COPY.onboardingBody}
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
              aria-live="polite"
              className="rounded-[var(--radius-input)] border border-green/20 bg-green-soft px-3 py-2 text-sm text-green-deep"
            >
              {formSuccess}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="certificate-name-input">
              {CERTIFICATE_NAME_COPY.accountLabel}
            </Label>
            <Input
              id="certificate-name-input"
              type="text"
              autoComplete="name"
              aria-invalid={Boolean(errors.certificateName)}
              aria-describedby={`${nameDescribedBy} ${previewDescribedBy}`}
              disabled={isSubmitting}
              {...certificateNameRegister}
              ref={certificateNameRef}
            />
            <p className="text-sm text-ink-soft">
              {CERTIFICATE_NAME_COPY.reviewCarefully}
            </p>
            {errors.certificateName ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.certificateName.message}
              </p>
            ) : null}
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-blue/30 bg-white px-4 py-5 text-center"
            aria-describedby={previewDescribedBy}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue">
              Certificate preview
            </p>
            <p className="mt-3 text-sm text-ink-soft">Awarded to</p>
            <p
              className="mt-1 break-words font-display text-[22px] font-medium leading-snug text-blue sm:text-[24px]"
              aria-live="polite"
            >
              {previewName || "Your confirmed name"}
            </p>
            <p id={previewDescribedBy} className="sr-only">
              Live preview of how your confirmed certificate name will appear on
              Elevate certificates. This preview is not a certificate.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="certificate-name-confirm"
              className="flex items-start gap-3 text-sm text-ink"
            >
              <input
                id="certificate-name-confirm"
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-[var(--color-blue)]"
                aria-invalid={Boolean(errors.confirmSpelling)}
                aria-describedby={confirmDescribedBy}
                disabled={isSubmitting}
                {...register("confirmSpelling")}
              />
              <span id={confirmDescribedBy}>
                {CERTIFICATE_NAME_COPY.signupConfirm}
              </span>
            </label>
            {errors.confirmSpelling ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.confirmSpelling.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="block" disabled={isSubmitting}>
            {isSubmitting
              ? "Confirming…"
              : CERTIFICATE_NAME_COPY.confirmAction}
          </Button>

          <button
            type="button"
            onClick={onLogout}
            disabled={isSubmitting}
            className="w-full text-center text-sm font-semibold text-blue hover:text-blue-deep disabled:opacity-60"
          >
            Log out
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
