import {
  ENQUIRY_HONEYPOT_FIELD,
  isHoneypotTriggered,
  submitLeadSchema,
  type SubmitLeadInput,
} from "@/features/leads/schemas/submit-lead"
import {
  isEnquiryRateLimited,
  recordEnquiryAttempt,
} from "@/features/leads/utils/enquiry-rate-limit"
import type {
  EnquiryEmailSendResult,
  EnquiryLeadSnapshot,
} from "@/features/leads/utils/enquiry-notification"
import type { Database, Json } from "@/types/database/supabase"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

type LeadNotificationStatus =
  Database["public"]["Enums"]["lead_notification_status"]

export type LeadInsertRow = Database["public"]["Tables"]["leads"]["Insert"]

export type InsertedLead = {
  id: string
  created_at: string
}

export type EnquirySubmissionDeps = {
  clientIp?: string | null
  insertLead: (row: LeadInsertRow) => Promise<InsertedLead | null>
  updateNotificationStatuses: (input: {
    leadId: string
    notificationStatus: LeadNotificationStatus
    visitorAckStatus: LeadNotificationStatus
    lastNotificationError: string | null
  }) => Promise<void>
  sendAdminNotification: (
    lead: EnquiryLeadSnapshot
  ) => Promise<EnquiryEmailSendResult>
  sendVisitorAcknowledgement: (input: {
    leadId: string
    leadType: string
    name: string
    email: string
  }) => Promise<EnquiryEmailSendResult>
  onHoneypot?: (info: { leadType: string; source: string | null }) => void
  onInsertError?: (info: { leadType: string; error?: string }) => void
  onUnexpectedError?: (info: { leadType: string; error: string }) => void
  onAdminNotifyError?: (info: { leadId: string; error: string }) => void
  onVisitorAckError?: (info: { leadId: string; error: string }) => void
}

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

function toJsonMetadata(
  value: Record<string, unknown> | null | undefined
): Json {
  if (!value) {
    return {}
  }
  return value as Json
}

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = metadata?.[key]
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Core enquiry submission (relative imports only — unit-testable under node:test).
 */
export async function submitEnquiryCore(
  input: SubmitLeadInput,
  deps: EnquirySubmissionDeps
): Promise<ActionResult<{ id: string }>> {
  const parsed = submitLeadSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  if (isHoneypotTriggered(parsed.data[ENQUIRY_HONEYPOT_FIELD])) {
    deps.onHoneypot?.({
      leadType: parsed.data.leadType,
      source: parsed.data.source ?? null,
    })
    return success({ id: crypto.randomUUID() })
  }

  const clientIp = deps.clientIp?.trim() || "unknown"
  if (isEnquiryRateLimited(parsed.data.email, clientIp)) {
    return failure(
      "rate_limited",
      "Too many enquiries were submitted recently. Please try again later."
    )
  }
  recordEnquiryAttempt(parsed.data.email, clientIp)

  const metadataRecord = (parsed.data.metadata ?? {}) as Record<string, unknown>
  const organizationName =
    parsed.data.organizationName?.trim() ||
    metadataString(metadataRecord, "organizationName")
  const estimatedParticipants =
    parsed.data.estimatedParticipants?.trim() ||
    metadataString(metadataRecord, "estimatedParticipants")
  const interest =
    parsed.data.interest?.trim() || metadataString(metadataRecord, "interest")

  const row: LeadInsertRow = {
    lead_type: parsed.data.leadType,
    name: parsed.data.name,
    email: parsed.data.email.trim().toLowerCase(),
    phone: parsed.data.phone ?? null,
    message: parsed.data.message ?? null,
    source: parsed.data.source ?? null,
    metadata: toJsonMetadata(parsed.data.metadata ?? undefined),
    status: "new",
    organization_name: organizationName,
    estimated_participants: estimatedParticipants,
    interest,
    notification_status: "pending",
    visitor_ack_status: "pending",
    last_notification_error: null,
  }

  try {
    const data = await deps.insertLead(row)

    if (!data) {
      deps.onInsertError?.({ leadType: parsed.data.leadType })
      return failure(
        "provider_error",
        "Unable to submit your request right now. Please try again."
      )
    }

    const snapshot: EnquiryLeadSnapshot = {
      id: data.id,
      leadType: parsed.data.leadType,
      name: parsed.data.name,
      email: parsed.data.email.trim().toLowerCase(),
      phone: parsed.data.phone ?? null,
      organizationName,
      estimatedParticipants,
      interest,
      message: parsed.data.message ?? null,
      source: parsed.data.source ?? null,
      createdAt: data.created_at,
    }

    let adminResult: EnquiryEmailSendResult
    let visitorResult: EnquiryEmailSendResult

    try {
      adminResult = await deps.sendAdminNotification(snapshot)
    } catch (error) {
      deps.onAdminNotifyError?.({
        leadId: data.id,
        error: error instanceof Error ? error.message : "unknown",
      })
      adminResult = {
        status: "failed",
        errorSummary: "unexpected_admin_notification_error",
      }
    }

    try {
      visitorResult = await deps.sendVisitorAcknowledgement({
        leadId: data.id,
        leadType: parsed.data.leadType,
        name: parsed.data.name,
        email: snapshot.email,
      })
    } catch (error) {
      deps.onVisitorAckError?.({
        leadId: data.id,
        error: error instanceof Error ? error.message : "unknown",
      })
      visitorResult = {
        status: "failed",
        errorSummary: "unexpected_visitor_ack_error",
      }
    }

    const lastError =
      adminResult.status === "sent"
        ? visitorResult.status === "failed" || visitorResult.status === "skipped"
          ? visitorResult.errorSummary ?? null
          : null
        : adminResult.errorSummary ?? "admin_notification_not_sent"

    await deps.updateNotificationStatuses({
      leadId: data.id,
      notificationStatus: adminResult.status,
      visitorAckStatus: visitorResult.status,
      lastNotificationError: lastError,
    })

    return success({ id: data.id })
  } catch (error) {
    deps.onUnexpectedError?.({
      leadType: parsed.data.leadType,
      error: error instanceof Error ? error.message : "unknown",
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
