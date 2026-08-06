"use client"

import { useId, useState, useTransition } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  EnquiryFormCard,
  EnquirySuccessPanel,
} from "@/features/leads/components/enquiry"
import { submitNonprofitPartnershipAction } from "@/features/leads/actions/leads.actions"
import {
  submitNonprofitPartnershipSchema,
  type SubmitNonprofitPartnershipInput,
} from "@/features/leads/schemas/submit-nonprofit-partnership"
import {
  NONPROFIT_ACCESS_AUDIENCE_OPTIONS,
  NONPROFIT_ENQUIRY_CTA,
  NONPROFIT_ENQUIRY_FORM_HEADING,
  NONPROFIT_ENQUIRY_FORM_SUPPORT,
  NONPROFIT_ENQUIRY_NO_PURCHASE,
  NONPROFIT_ENQUIRY_SUCCESS_BODY,
  NONPROFIT_ENQUIRY_SUCCESS_HEADING,
  NONPROFIT_PARTICIPANT_RANGE_OPTIONS,
} from "@/features/leads/utils/nonprofit-enquiry"
import { EDUCATIONAL_DISCLAIMER } from "@/features/checkout/constants/disclaimer"

type NonprofitPartnershipFormProps = {
  isAuthenticated: boolean
  className?: string
}

function FieldError({
  id,
  message,
}: {
  id: string
  message?: string
}) {
  if (!message) {
    return null
  }
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

function NonprofitPartnershipForm({
  isAuthenticated,
  className,
}: NonprofitPartnershipFormProps) {
  const formId = useId()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitLocked, setSubmitLocked] = useState(false)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<SubmitNonprofitPartnershipInput>({
    resolver: zodResolver(submitNonprofitPartnershipSchema),
    defaultValues: {
      name: "",
      email: "",
      organizationName: "",
      organizationWebsite: "",
      phone: "",
      role: "",
      estimatedParticipants: "" as never,
      accessAudience: "" as never,
      partnershipNotes: "",
      message: "",
    },
  })

  function onInvalid() {
    const order: (keyof SubmitNonprofitPartnershipInput)[] = [
      "name",
      "email",
      "organizationName",
      "organizationWebsite",
      "phone",
      "role",
      "estimatedParticipants",
      "accessAudience",
      "partnershipNotes",
      "message",
    ]
    const first = order.find((key) => errors[key])
    if (first) {
      setFocus(first)
    }
  }

  function onSubmit(values: SubmitNonprofitPartnershipInput) {
    if (submitLocked || isPending || submitted) {
      return
    }

    setSubmitLocked(true)
    setServerError(null)

    startTransition(async () => {
      try {
        const result = await submitNonprofitPartnershipAction(values)

        if (!result.success) {
          setSubmitLocked(false)
          setServerError(result.error.message)
          return
        }

        setSubmitted(true)
      } catch {
        setSubmitLocked(false)
        setServerError(
          "Unable to submit your request right now. Please try again."
        )
      }
    })
  }

  if (submitted) {
    return (
      <EnquirySuccessPanel
        heading={NONPROFIT_ENQUIRY_SUCCESS_HEADING}
        body={NONPROFIT_ENQUIRY_SUCCESS_BODY}
        isAuthenticated={isAuthenticated}
        className={className}
      />
    )
  }

  const nameErrorId = `${formId}-name-error`
  const emailErrorId = `${formId}-email-error`
  const orgErrorId = `${formId}-org-error`
  const websiteErrorId = `${formId}-website-error`
  const phoneErrorId = `${formId}-phone-error`
  const roleErrorId = `${formId}-role-error`
  const participantsErrorId = `${formId}-participants-error`
  const accessErrorId = `${formId}-access-error`
  const notesErrorId = `${formId}-notes-error`
  const messageErrorId = `${formId}-message-error`
  const serverErrorId = `${formId}-server-error`

  return (
    <EnquiryFormCard
      heading={NONPROFIT_ENQUIRY_FORM_HEADING}
      support={NONPROFIT_ENQUIRY_FORM_SUPPORT}
      className={className}
    >
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="mt-6 space-y-4"
        aria-describedby={serverError ? serverErrorId : undefined}
      >
        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-name`}>
              Full name{" "}
              <span className="font-normal text-ink-soft">(required)</span>
            </Label>
            <Input
              id={`${formId}-name`}
              autoComplete="name"
              aria-required="true"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? nameErrorId : undefined}
              {...register("name")}
            />
            <FieldError id={nameErrorId} message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-email`}>
              Work email address{" "}
              <span className="font-normal text-ink-soft">(required)</span>
            </Label>
            <Input
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              aria-required="true"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? emailErrorId : undefined}
              {...register("email")}
            />
            <FieldError id={emailErrorId} message={errors.email?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-org`}>
              Organization name{" "}
              <span className="font-normal text-ink-soft">(required)</span>
            </Label>
            <Input
              id={`${formId}-org`}
              autoComplete="organization"
              aria-required="true"
              aria-invalid={errors.organizationName ? true : undefined}
              aria-describedby={
                errors.organizationName ? orgErrorId : undefined
              }
              {...register("organizationName")}
            />
            <FieldError
              id={orgErrorId}
              message={errors.organizationName?.message}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-website`}>
              Organization website{" "}
              <span className="font-normal text-ink-soft">(optional)</span>
            </Label>
            <Input
              id={`${formId}-website`}
              type="url"
              inputMode="url"
              placeholder="https://"
              autoComplete="url"
              aria-invalid={errors.organizationWebsite ? true : undefined}
              aria-describedby={
                errors.organizationWebsite ? websiteErrorId : undefined
              }
              {...register("organizationWebsite")}
            />
            <FieldError
              id={websiteErrorId}
              message={errors.organizationWebsite?.message}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-phone`}>
              Phone number{" "}
              <span className="font-normal text-ink-soft">(optional)</span>
            </Label>
            <Input
              id={`${formId}-phone`}
              type="tel"
              autoComplete="tel"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? phoneErrorId : undefined}
              {...register("phone")}
            />
            <FieldError id={phoneErrorId} message={errors.phone?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-role`}>
              Your role{" "}
              <span className="font-normal text-ink-soft">(optional)</span>
            </Label>
            <Input
              id={`${formId}-role`}
              autoComplete="organization-title"
              aria-invalid={errors.role ? true : undefined}
              aria-describedby={errors.role ? roleErrorId : undefined}
              {...register("role")}
            />
            <FieldError id={roleErrorId} message={errors.role?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-participants`}>
            Estimated number of participants{" "}
            <span className="font-normal text-ink-soft">(required)</span>
          </Label>
          <select
            id={`${formId}-participants`}
            className="min-h-11 w-full rounded-[var(--radius-input)] border border-line bg-surface px-3.5 py-3 text-[15px] text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
            aria-required="true"
            aria-invalid={errors.estimatedParticipants ? true : undefined}
            aria-describedby={
              errors.estimatedParticipants ? participantsErrorId : undefined
            }
            {...register("estimatedParticipants")}
          >
            <option value="">Select a range</option>
            {NONPROFIT_PARTICIPANT_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError
            id={participantsErrorId}
            message={errors.estimatedParticipants?.message}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[13px] font-semibold text-ink-soft">
            Who will receive access?{" "}
            <span className="font-normal">(required)</span>
          </legend>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-required="true"
            aria-invalid={errors.accessAudience ? true : undefined}
            aria-describedby={
              errors.accessAudience ? accessErrorId : undefined
            }
          >
            {NONPROFIT_ACCESS_AUDIENCE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-line px-3.5 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-blue has-[:checked]:bg-blue/5"
              >
                <input
                  type="radio"
                  value={option.value}
                  className="size-4 shrink-0 accent-[var(--color-blue)]"
                  {...register("accessAudience")}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <FieldError
            id={accessErrorId}
            message={errors.accessAudience?.message}
          />
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-notes`}>
            Preferred partnership or billing notes{" "}
            <span className="font-normal text-ink-soft">(optional)</span>
          </Label>
          <textarea
            id={`${formId}-notes`}
            rows={3}
            className="min-h-20 w-full rounded-[var(--radius-input)] border border-line bg-surface px-3.5 py-3 text-[15px] text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-invalid={errors.partnershipNotes ? true : undefined}
            aria-describedby={errors.partnershipNotes ? notesErrorId : undefined}
            {...register("partnershipNotes")}
          />
          <FieldError
            id={notesErrorId}
            message={errors.partnershipNotes?.message}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-message`}>
            Message{" "}
            <span className="font-normal text-ink-soft">(optional)</span>
          </Label>
          <textarea
            id={`${formId}-message`}
            rows={4}
            className="min-h-24 w-full rounded-[var(--radius-input)] border border-line bg-surface px-3.5 py-3 text-[15px] text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? messageErrorId : undefined}
            {...register("message")}
          />
          <FieldError id={messageErrorId} message={errors.message?.message} />
        </div>

        {serverError ? (
          <p id={serverErrorId} role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending || submitted || submitLocked}
          className="w-full min-h-11"
        >
          {isPending ? "Submitting…" : NONPROFIT_ENQUIRY_CTA}
        </Button>

        <p className="text-center text-sm text-ink-soft">
          {NONPROFIT_ENQUIRY_NO_PURCHASE}
        </p>

        <p className="text-center text-xs text-ink-soft">
          By submitting, you agree to our{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-ink"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-ink-soft/80">
        {EDUCATIONAL_DISCLAIMER}
      </p>
    </EnquiryFormCard>
  )
}

export { NonprofitPartnershipForm, type NonprofitPartnershipFormProps }
