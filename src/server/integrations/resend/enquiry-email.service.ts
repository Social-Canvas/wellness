import "server-only"

import { z } from "zod"

import {
  buildEnquiryAdminNotificationTemplate,
  buildEnquiryVisitorAcknowledgementTemplate,
  type EnquiryEmailSendResult,
  type EnquiryLeadSnapshot,
} from "@/features/leads/utils/enquiry-notification"
import { getEnquiryNotificationTo } from "@/features/leads/utils/enquiry-config"
import { logger, safeErrorMessage } from "@/server/utils/logger"
import {
  getTransactionalEmailConfig,
  isRecipientAllowed,
  validateTransactionalSender,
} from "@/server/integrations/resend/email-config"
import { getResendClient } from "@/server/integrations/resend/client"
import { redactProviderError } from "@/server/integrations/resend/lifecycle-email.pure"

export type { EnquiryEmailSendResult }

const emailSchema = z.email()

async function sendEnquiryEmail(params: {
  to: string
  replyTo?: string
  subject: string
  html: string
  text: string
  dedupeKey: string
  context: Record<string, unknown>
  /** Admin notify TO is server-configured; bypass customer allowlist. */
  bypassAllowlist?: boolean
}): Promise<EnquiryEmailSendResult> {
  const config = getTransactionalEmailConfig()
  const sender = validateTransactionalSender(config)

  if (!sender.ok) {
    logger.warn("Skipping enquiry email because sender config is not ready.", {
      dedupeKey: params.dedupeKey,
      reason: sender.reason,
      ...params.context,
    })
    return { status: "skipped", errorSummary: sender.reason }
  }

  if (!params.bypassAllowlist) {
    const allow = isRecipientAllowed(params.to, config)
    if (!allow.allowed) {
      logger.warn("Skipping enquiry email because recipient is not allowed.", {
        dedupeKey: params.dedupeKey,
        reason: allow.reason,
        ...params.context,
      })
      return {
        status: "skipped",
        errorSummary: allow.reason ?? "recipient_not_allowed",
      }
    }
  } else if (!emailSchema.safeParse(params.to).success) {
    return { status: "failed", errorSummary: "invalid_admin_recipient" }
  }

  const replyTo =
    params.replyTo && emailSchema.safeParse(params.replyTo).success
      ? params.replyTo.trim().toLowerCase()
      : sender.replyTo

  try {
    const resend = getResendClient()
    const result = await resend.emails.send({
      from: sender.fromHeader,
      to: params.to,
      ...(replyTo ? { replyTo } : {}),
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: {
        "X-Elevate-Dedupe-Key": params.dedupeKey,
      },
    })

    if (result.error) {
      logger.error("Enquiry email send failed.", {
        dedupeKey: params.dedupeKey,
        resendError: redactProviderError(result.error),
        ...params.context,
      })
      return {
        status: "failed",
        errorSummary: "resend_provider_error",
      }
    }

    logger.info("Enquiry email sent.", {
      dedupeKey: params.dedupeKey,
      providerId: result.data?.id,
      ...params.context,
    })

    return { status: "sent", providerId: result.data?.id }
  } catch (error) {
    logger.error("Enquiry email threw unexpectedly.", {
      dedupeKey: params.dedupeKey,
      error: safeErrorMessage(error),
      ...params.context,
    })
    return { status: "failed", errorSummary: "unexpected_send_error" }
  }
}

export async function sendEnquiryAdminNotification(
  lead: EnquiryLeadSnapshot
): Promise<EnquiryEmailSendResult> {
  const to = getEnquiryNotificationTo()
  if (!to) {
    logger.warn(
      "Enquiry admin notification skipped: ENQUIRY_NOTIFICATION_TO missing or invalid.",
      { leadId: lead.id, leadType: lead.leadType }
    )
    return {
      status: "skipped",
      errorSummary: "ENQUIRY_NOTIFICATION_TO is not configured",
    }
  }

  const template = buildEnquiryAdminNotificationTemplate(lead)

  return sendEnquiryEmail({
    to,
    replyTo: lead.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    dedupeKey: `enquiry-admin:${lead.id}`,
    context: {
      emailType: "enquiry_admin_notification",
      leadId: lead.id,
      leadType: lead.leadType,
    },
    bypassAllowlist: true,
  })
}

export async function sendEnquiryVisitorAcknowledgement(input: {
  leadId: string
  leadType: string
  name: string
  email: string
}): Promise<EnquiryEmailSendResult> {
  const template = buildEnquiryVisitorAcknowledgementTemplate({
    name: input.name,
  })

  return sendEnquiryEmail({
    to: input.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    dedupeKey: `enquiry-visitor-ack:${input.leadId}`,
    context: {
      emailType: "enquiry_visitor_acknowledgement",
      leadId: input.leadId,
      leadType: input.leadType,
    },
    bypassAllowlist: false,
  })
}
