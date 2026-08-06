"use client"

import { useId, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { redeemOrganizationAccessAction } from "@/features/organizations/actions/organization-access.actions"
import {
  redeemOrganizationAccessSchema,
  type RedeemOrganizationAccessInput,
} from "@/features/organizations/schemas/redeem-organization-access"

export function RedeemOrganizationAccessForm() {
  const formId = useId()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedeemOrganizationAccessInput>({
    resolver: zodResolver(redeemOrganizationAccessSchema),
    defaultValues: { code: "" },
  })

  function onSubmit(values: RedeemOrganizationAccessInput) {
    setServerError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const result = await redeemOrganizationAccessAction(values)
      if (!result.success) {
        setServerError(result.error.message)
        return
      }

      setSuccessMessage("Your sponsored Elevate access is now active.")
      router.push(result.data.destinationPath)
      router.refresh()
    })
  }

  const codeErrorId = `${formId}-code-error`
  const serverErrorId = `${formId}-server-error`

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto mt-8 max-w-md space-y-4"
      aria-describedby={serverError ? serverErrorId : undefined}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-code`}>Organization access code</Label>
        <Input
          id={`${formId}-code`}
          autoComplete="off"
          spellCheck={false}
          placeholder="ELEVATE-XXXX-XXXX"
          aria-invalid={errors.code ? true : undefined}
          aria-describedby={errors.code ? codeErrorId : undefined}
          {...register("code")}
        />
        {errors.code ? (
          <p id={codeErrorId} role="alert" className="text-sm text-destructive">
            {errors.code.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p id={serverErrorId} role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      {successMessage ? (
        <p role="status" className="text-sm text-green-deep">
          {successMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full min-h-11">
        {isPending ? "Activating…" : "Activate sponsored access"}
      </Button>
    </form>
  )
}
