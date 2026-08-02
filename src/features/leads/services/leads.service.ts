import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  submitLeadSchema,
  type SubmitLeadInput,
} from "@/features/leads/schemas/submit-lead"
import {
  submitNonprofitPartnershipSchema,
  normalizeNonprofitPartnershipInput,
  type SubmitNonprofitPartnershipInput,
} from "@/features/leads/schemas/submit-nonprofit-partnership"
import {
  buildNonprofitEnquiryMetadata,
  composeNonprofitEnquiryMessage,
  nonprofitEnquirySource,
  type NonprofitAccessAudience,
} from "@/features/leads/utils/nonprofit-enquiry"
import {
  NONPROFIT_SEAT_PLANS,
  parseNonprofitPlanParam,
} from "@/features/checkout/utils/membership-audience"
import { createClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/types/database/supabase"

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function validationFailure(message: string): ActionResult<never> {
  return failure("validation_error", message)
}

function firstValidationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

function mapDatabaseError(): ActionResult<never> {
  return failure(
    "provider_error",
    "Unable to submit your request right now. Please try again."
  )
}

function toJsonMetadata(
  value: Record<string, unknown> | null | undefined
): Json {
  if (!value) {
    return {}
  }
  return value as Json
}

export async function submitLead(
  input: SubmitLeadInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = submitLeadSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  const row: Database["public"]["Tables"]["leads"]["Insert"] = {
    lead_type: parsed.data.leadType,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    message: parsed.data.message ?? null,
    source: parsed.data.source ?? null,
    metadata: toJsonMetadata(parsed.data.metadata ?? undefined),
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("leads")
      .insert(row)
      .select("id")
      .single()

    if (error || !data) {
      return mapDatabaseError()
    }

    return success({ id: data.id })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

/**
 * Nonprofit partnership enquiry — maps approved plan ids only; never persists
 * attacker-controlled plan text.
 */
export async function submitNonprofitPartnership(
  input: SubmitNonprofitPartnershipInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = submitNonprofitPartnershipSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  const data = normalizeNonprofitPartnershipInput(parsed.data)
  const planSlug = parseNonprofitPlanParam(data.planSlug)
  const plan = planSlug
    ? (NONPROFIT_SEAT_PLANS.find((entry) => entry.slug === planSlug) ?? null)
    : null
  const accessAudience = data.accessAudience as NonprofitAccessAudience
  const metadata = buildNonprofitEnquiryMetadata({
    plan,
    organizationName: data.organizationName,
    organizationWebsite: data.organizationWebsite,
    role: data.role,
    estimatedParticipants: data.estimatedParticipants,
    accessAudience,
  })
  const message = composeNonprofitEnquiryMessage({
    plan,
    organizationName: data.organizationName,
    organizationWebsite: data.organizationWebsite,
    role: data.role,
    estimatedParticipants: data.estimatedParticipants,
    accessAudience,
    message: data.message,
  })

  return submitLead({
    leadType: "private_event",
    name: data.name,
    email: data.email,
    phone: data.phone,
    message,
    source: nonprofitEnquirySource(plan?.slug ?? null),
    metadata,
  })
}
