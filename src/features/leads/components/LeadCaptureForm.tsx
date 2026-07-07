"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { submitLeadAction } from "@/features/leads/actions/leads.actions"
import {
  submitLeadSchema,
  type SubmitLeadInput,
} from "@/features/leads/schemas/submit-lead"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type LeadCaptureFormProps = {
  leadType: SubmitLeadInput["leadType"]
  source: string
  title: string
  description: string
  submitLabel?: string
  className?: string
}

function LeadCaptureForm({
  leadType,
  source,
  title,
  description,
  submitLabel = "Submit enquiry",
  className,
}: LeadCaptureFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmitLeadInput>({
    resolver: zodResolver(submitLeadSchema),
    defaultValues: {
      leadType,
      source,
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  })

  function onSubmit(values: SubmitLeadInput) {
    setServerError(null)

    startTransition(async () => {
      const result = await submitLeadAction(values)

      if (!result.success) {
        setServerError(result.error.message)
        return
      }

      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div
        className={cn(
          "rounded-[18px] border border-line bg-surface px-8 py-8 text-center",
          className
        )}
      >
        <h2 className="font-display text-2xl font-medium text-ink">Thank you</h2>
        <p className="mt-3 text-sm text-ink-soft">
          We received your enquiry and will be in touch shortly.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-[18px] border border-line bg-surface px-8 py-8",
        className
      )}
    >
      <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-medium text-ink">
        {title}
      </h1>
      <p className="mt-3 text-base text-ink-soft">{description}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" autoComplete="name" {...register("name")} />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
          {errors.phone ? (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message">Message (optional)</Label>
          <textarea
            id="message"
            rows={4}
            className="w-full rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[15px] text-ink"
            {...register("message")}
          />
          {errors.message ? (
            <p className="text-sm text-destructive">{errors.message.message}</p>
          ) : null}
        </div>

        <p className="rounded-[10px] border border-line bg-cream2 px-3.5 py-3 text-xs text-ink-soft">
          This content is educational and is not medical advice. Always consult your
          physician before making health decisions.
        </p>

        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Submitting…" : submitLabel}
        </Button>
      </form>
    </div>
  )
}

export { LeadCaptureForm, type LeadCaptureFormProps }
