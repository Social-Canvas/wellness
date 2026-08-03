"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button, Input, Label } from "@/components/ui"
import { adminCorrectCertificateNameAction } from "@/features/auth/actions/certificate-name.actions"
import {
  adminCorrectCertificateNameSchema,
  type AdminCorrectCertificateNameInput,
} from "@/features/auth/schemas"

type CertificateNameCorrectFormProps = {
  profileId: string
  currentCertificateName: string | null
}

export function CertificateNameCorrectForm({
  profileId,
  currentCertificateName,
}: CertificateNameCorrectFormProps) {
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const form = useForm<AdminCorrectCertificateNameInput>({
    resolver: zodResolver(adminCorrectCertificateNameSchema),
    defaultValues: {
      profileId,
      certificateName: currentCertificateName ?? "",
      reason: "",
      confirmCorrection: undefined as unknown as true,
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(values: AdminCorrectCertificateNameInput) {
    setFormError(null)
    setFormSuccess(null)

    const result = await adminCorrectCertificateNameAction(values)

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    setFormSuccess("Certificate name corrected. Issued certificates were not changed.")
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-ink">
          {currentCertificateName?.trim() || "Not set"}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-blue hover:text-blue-deep"
          onClick={() => setOpen(true)}
        >
          Admin correction
        </button>
        {formSuccess ? (
          <p role="status" className="text-xs text-green-deep">
            {formSuccess}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <form className="max-w-sm space-y-3 rounded-xl border border-line bg-cream2/40 p-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-xs text-ink-soft">
        Corrections are audited. Existing certificate snapshots are not changed
        automatically.
      </p>
      <input type="hidden" {...register("profileId")} />
      <div className="space-y-1">
        <Label htmlFor={`correct-name-${profileId}`}>Corrected certificate name</Label>
        <Input
          id={`correct-name-${profileId}`}
          aria-invalid={Boolean(errors.certificateName)}
          disabled={isSubmitting}
          {...register("certificateName")}
        />
        {errors.certificateName ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.certificateName.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`correct-reason-${profileId}`}>Reason</Label>
        <Input
          id={`correct-reason-${profileId}`}
          aria-invalid={Boolean(errors.reason)}
          disabled={isSubmitting}
          {...register("reason")}
        />
        {errors.reason ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.reason.message}
          </p>
        ) : null}
      </div>
      <label className="flex items-start gap-2 text-xs text-ink">
        <input
          type="checkbox"
          className="mt-0.5 size-3.5 accent-[var(--color-blue)]"
          disabled={isSubmitting}
          {...register("confirmCorrection")}
        />
        <span>I confirm this audited correction is required.</span>
      </label>
      {errors.confirmCorrection ? (
        <p role="alert" className="text-xs text-destructive">
          {errors.confirmCorrection.message}
        </p>
      ) : null}
      {formError ? (
        <p role="alert" className="text-xs text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save correction"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
