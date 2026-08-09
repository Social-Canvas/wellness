"use client"

import { useId, useState, useTransition } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  EnquiryFormCard,
  EnquirySuccessPanel,
} from "@/features/leads/components/enquiry"
import { submitLeadAction } from "@/features/leads/actions/leads.actions"
import { ENQUIRY_EDUCATIONAL_DISCLAIMER } from "@/features/leads/utils/enquiry-intents"
import {
  RETREAT_ENQUIRY_CTA,
  RETREAT_ENQUIRY_FORM_HEADING,
  RETREAT_ENQUIRY_FORM_SUPPORT,
  RETREAT_ENQUIRY_INTENT,
  RETREAT_ENQUIRY_INTEREST_LABEL,
  RETREAT_ENQUIRY_NO_PURCHASE,
  RETREAT_ENQUIRY_SOURCE,
  RETREAT_ENQUIRY_SUCCESS_BODY,
  RETREAT_ENQUIRY_SUCCESS_HEADING,
  RETREAT_INTEREST_OPTIONS,
  buildRetreatEnquiryMetadata,
  composeRetreatEnquiryMessage,
} from "@/features/leads/utils/retreat-enquiry"
import {
  VIP_ENQUIRY_CTA,
  VIP_ENQUIRY_FORM_HEADING,
  VIP_ENQUIRY_FORM_SUPPORT,
  VIP_ENQUIRY_INTENT,
  VIP_ENQUIRY_MESSAGE_LABEL,
  VIP_ENQUIRY_NO_PURCHASE,
  VIP_ENQUIRY_SOURCE,
  VIP_ENQUIRY_SUCCESS_BODY,
  VIP_ENQUIRY_SUCCESS_HEADING,
  buildVipEnquiryMetadata,
} from "@/features/leads/utils/vip-enquiry"

const leadEnquiryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120, "Name is too long."),
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .max(40, "Phone number is too long.")
    .optional()
    .nullable(),
  location: z
    .string()
    .trim()
    .max(120, "Location is too long.")
    .optional()
    .nullable(),
  interest: z.string().trim().max(80).optional().nullable(),
  message: z
    .string()
    .trim()
    .max(4000, "Message is too long.")
    .optional()
    .nullable(),
})

type LeadEnquiryFormValues = z.infer<typeof leadEnquiryFormSchema>

type LeadEnquiryVariant = "retreat" | "vip"

type LeadEnquiryFormProps = {
  variant: LeadEnquiryVariant
  isAuthenticated: boolean
  className?: string
}

const VARIANT_CONFIG = {
  retreat: {
    leadType: RETREAT_ENQUIRY_INTENT,
    source: RETREAT_ENQUIRY_SOURCE,
    formHeading: RETREAT_ENQUIRY_FORM_HEADING,
    formSupport: RETREAT_ENQUIRY_FORM_SUPPORT,
    cta: RETREAT_ENQUIRY_CTA,
    noPurchase: RETREAT_ENQUIRY_NO_PURCHASE,
    successHeading: RETREAT_ENQUIRY_SUCCESS_HEADING,
    successBody: RETREAT_ENQUIRY_SUCCESS_BODY,
    messageLabel: "Message (optional)",
    showExtraFields: true,
  },
  vip: {
    leadType: VIP_ENQUIRY_INTENT,
    source: VIP_ENQUIRY_SOURCE,
    formHeading: VIP_ENQUIRY_FORM_HEADING,
    formSupport: VIP_ENQUIRY_FORM_SUPPORT,
    cta: VIP_ENQUIRY_CTA,
    noPurchase: VIP_ENQUIRY_NO_PURCHASE,
    successHeading: VIP_ENQUIRY_SUCCESS_HEADING,
    successBody: VIP_ENQUIRY_SUCCESS_BODY,
    messageLabel: VIP_ENQUIRY_MESSAGE_LABEL,
    showExtraFields: false,
  },
} as const

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

function LeadEnquiryForm({
  variant,
  isAuthenticated,
  className,
}: LeadEnquiryFormProps) {
  const config = VARIANT_CONFIG[variant]
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
  } = useForm<LeadEnquiryFormValues>({
    resolver: zodResolver(leadEnquiryFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      location: "",
      interest: "",
      message: "",
    },
  })

  function onInvalid() {
    const order: (keyof LeadEnquiryFormValues)[] = [
      "name",
      "email",
      "phone",
      "location",
      "interest",
      "message",
    ]
    const first = order.find((key) => errors[key])
    if (first) {
      setFocus(first)
    }
  }

  function onSubmit(values: LeadEnquiryFormValues) {
    if (submitLocked || isPending || submitted) {
      return
    }

    setSubmitLocked(true)
    setServerError(null)

    startTransition(async () => {
      try {
        const interest =
          variant === "retreat" ? values.interest?.trim() || null : null
        const location =
          variant === "retreat" ? values.location?.trim() || null : null

        const message =
          variant === "retreat"
            ? composeRetreatEnquiryMessage({
                message: values.message,
                interest,
                location,
              })
            : values.message?.trim() || null

        const metadata =
          variant === "retreat"
            ? buildRetreatEnquiryMetadata({ interest, location })
            : buildVipEnquiryMetadata()

        const result = await submitLeadAction({
          leadType: config.leadType,
          source: config.source,
          name: values.name,
          email: values.email,
          phone: values.phone?.trim() || null,
          message,
          metadata,
        })

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
        heading={config.successHeading}
        body={config.successBody}
        isAuthenticated={isAuthenticated}
        className={className}
      />
    )
  }

  const nameErrorId = `${formId}-name-error`
  const emailErrorId = `${formId}-email-error`
  const phoneErrorId = `${formId}-phone-error`
  const locationErrorId = `${formId}-location-error`
  const interestErrorId = `${formId}-interest-error`
  const messageErrorId = `${formId}-message-error`
  const serverErrorId = `${formId}-server-error`

  return (
    <EnquiryFormCard
      heading={config.formHeading}
      support={config.formSupport}
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
              Email address{" "}
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

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-phone`}>
            Phone{" "}
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

        {config.showExtraFields ? (
          <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-location`}>
                Location{" "}
                <span className="font-normal text-ink-soft">(optional)</span>
              </Label>
              <Input
                id={`${formId}-location`}
                autoComplete="address-level2"
                aria-invalid={errors.location ? true : undefined}
                aria-describedby={
                  errors.location ? locationErrorId : undefined
                }
                {...register("location")}
              />
              <FieldError
                id={locationErrorId}
                message={errors.location?.message}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-interest`}>
                {RETREAT_ENQUIRY_INTEREST_LABEL}{" "}
                <span className="font-normal text-ink-soft">(optional)</span>
              </Label>
              <select
                id={`${formId}-interest`}
                className="min-h-11 w-full rounded-[var(--radius-input)] border border-line bg-surface px-3.5 py-3 text-[15px] text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-invalid={errors.interest ? true : undefined}
                aria-describedby={
                  errors.interest ? interestErrorId : undefined
                }
                {...register("interest")}
              >
                {RETREAT_INTEREST_OPTIONS.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError
                id={interestErrorId}
                message={errors.interest?.message}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-message`}>{config.messageLabel}</Label>
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
          {isPending ? "Submitting…" : config.cta}
        </Button>

        <p className="text-center text-sm text-ink-soft">{config.noPurchase}</p>

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
        {ENQUIRY_EDUCATIONAL_DISCLAIMER}
      </p>
    </EnquiryFormCard>
  )
}

export { LeadEnquiryForm, type LeadEnquiryFormProps }
