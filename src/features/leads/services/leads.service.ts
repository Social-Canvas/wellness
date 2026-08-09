import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  ENQUIRY_HONEYPOT_FIELD,
  isHoneypotTriggered,
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
  submitEnquiryCore,
  type EnquirySubmissionDeps,
  type InsertedLead,
  type LeadInsertRow,
} from "@/features/leads/services/enquiry-submission.core"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database/supabase"
import { logger, safeErrorMessage } from "@/server/utils/logger"
import {
  sendEnquiryAdminNotification,
  sendEnquiryVisitorAcknowledgement,
} from "@/server/integrations/resend/enquiry-email.service"

type LeadNotificationStatus =
  Database["public"]["Enums"]["lead_notification_status"]

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

function honeypotSuccess(): ActionResult<{ id: string }> {
  return success({ id: crypto.randomUUID() })
}

export type SubmitLeadOptions = {
  clientIp?: string | null
  insertLead?: (row: LeadInsertRow) => Promise<InsertedLead | null>
  updateNotificationStatuses?: EnquirySubmissionDeps["updateNotificationStatuses"]
  sendAdminNotification?: EnquirySubmissionDeps["sendAdminNotification"]
  sendVisitorAcknowledgement?: EnquirySubmissionDeps["sendVisitorAcknowledgement"]
}

async function defaultInsertLead(row: LeadInsertRow): Promise<InsertedLead | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("id, created_at")
    .single()

  if (error || !data) {
    logger.error("Lead insert failed.", {
      leadType: row.lead_type,
      error: error?.message ?? "missing_row",
    })
    return null
  }

  return data
}

async function defaultPersistNotificationStatuses(input: {
  leadId: string
  notificationStatus: LeadNotificationStatus
  visitorAckStatus: LeadNotificationStatus
  lastNotificationError: string | null
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("leads")
      .update({
        notification_status: input.notificationStatus,
        visitor_ack_status: input.visitorAckStatus,
        last_notification_error: input.lastNotificationError,
      })
      .eq("id", input.leadId)

    if (error) {
      logger.error("Failed to update lead notification statuses.", {
        leadId: input.leadId,
        error: error.message,
      })
    }
  } catch (error) {
    logger.error("Unexpected error updating lead notification statuses.", {
      leadId: input.leadId,
      error: safeErrorMessage(error),
    })
  }
}

function buildDeps(options: SubmitLeadOptions): EnquirySubmissionDeps {
  return {
    clientIp: options.clientIp,
    insertLead: options.insertLead ?? defaultInsertLead,
    updateNotificationStatuses:
      options.updateNotificationStatuses ?? defaultPersistNotificationStatuses,
    sendAdminNotification:
      options.sendAdminNotification ?? sendEnquiryAdminNotification,
    sendVisitorAcknowledgement:
      options.sendVisitorAcknowledgement ?? sendEnquiryVisitorAcknowledgement,
    onHoneypot: (info) => {
      logger.info("Enquiry honeypot triggered; skipping persistence.", info)
    },
    onInsertError: (info) => {
      logger.error("Lead insert failed.", info)
    },
    onUnexpectedError: (info) => {
      logger.error("Unexpected lead submission error.", info)
    },
    onAdminNotifyError: (info) => {
      logger.error("Enquiry admin notification threw after insert.", info)
    },
    onVisitorAckError: (info) => {
      logger.error("Enquiry visitor acknowledgement threw after insert.", info)
    },
  }
}

/**
 * Central enquiry submission path:
 * validate → honeypot → rate limit → durable insert → notify (non-blocking).
 */
export async function submitLead(
  input: SubmitLeadInput,
  options: SubmitLeadOptions = {}
): Promise<ActionResult<{ id: string }>> {
  return submitEnquiryCore(input, buildDeps(options))
}

/**
 * Nonprofit partnership enquiry — participant estimate is informational only.
 * Does not assign a public pricing plan or create an organization.
 */
export async function submitNonprofitPartnership(
  input: SubmitNonprofitPartnershipInput,
  options: SubmitLeadOptions = {}
): Promise<ActionResult<{ id: string }>> {
  const parsed = submitNonprofitPartnershipSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  if (isHoneypotTriggered(parsed.data[ENQUIRY_HONEYPOT_FIELD])) {
    logger.info("Nonprofit enquiry honeypot triggered; skipping persistence.")
    return honeypotSuccess()
  }

  const data = normalizeNonprofitPartnershipInput(parsed.data)
  const accessAudience = data.accessAudience as NonprofitAccessAudience
  const metadata = buildNonprofitEnquiryMetadata({
    organizationName: data.organizationName,
    organizationWebsite: data.organizationWebsite,
    role: data.role,
    estimatedParticipants: data.estimatedParticipants,
    accessAudience,
    partnershipNotes: data.partnershipNotes,
  })
  const message = composeNonprofitEnquiryMessage({
    organizationName: data.organizationName,
    organizationWebsite: data.organizationWebsite,
    role: data.role,
    estimatedParticipants: data.estimatedParticipants,
    accessAudience,
    partnershipNotes: data.partnershipNotes,
    message: data.message,
  })

  return submitLead(
    {
      leadType: "nonprofit",
      name: data.name,
      email: data.email,
      phone: data.phone,
      message,
      source: nonprofitEnquirySource(),
      organizationName: data.organizationName,
      estimatedParticipants: data.estimatedParticipants,
      metadata,
      [ENQUIRY_HONEYPOT_FIELD]: "",
    },
    options
  )
}
