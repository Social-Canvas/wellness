import "server-only"

import { env } from "@/lib/config"
import {
  buildCertificateEarnedTemplate,
  buildMembershipActivatedTemplate,
  buildPaymentFailedTemplate,
  buildPurchaseConfirmationTemplate,
  buildResetAccessGrantedTemplate,
  type EmailTemplate,
} from "@/emails/transactional-templates"
import { logger, safeErrorMessage } from "@/server/utils/logger"

import { getResendClient } from "./client"
import {
  getTransactionalEmailConfig,
  isRecipientAllowed,
  validateTransactionalSender,
} from "./email-config"
import { redactProviderError } from "./lifecycle-email.pure"

type SendTransactionalEmailParams = {
  to: string
  dedupeKey: string
  template: EmailTemplate
  context: Record<string, unknown>
}

type SendTransactionalEmailResult = {
  sent: boolean
  providerId?: string
  skippedReason?: string
}

async function sendTransactionalEmail({
  to,
  dedupeKey,
  template,
  context,
}: SendTransactionalEmailParams): Promise<SendTransactionalEmailResult> {
  const config = getTransactionalEmailConfig()
  const sender = validateTransactionalSender(config)

  if (!sender.ok) {
    logger.warn("Skipping transactional email because sender config is not ready.", {
      dedupeKey,
      reason: sender.reason,
      ...context,
    })
    return { sent: false, skippedReason: sender.reason }
  }

  const allow = isRecipientAllowed(to, config)
  if (!allow.allowed) {
    logger.warn("Skipping transactional email because recipient is not allowed.", {
      dedupeKey,
      reason: allow.reason,
      ...context,
    })
    return { sent: false, skippedReason: allow.reason }
  }

  try {
    const resend = getResendClient()
    const result = await resend.emails.send({
      from: sender.fromHeader,
      to,
      ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: {
        "X-Elevate-Dedupe-Key": dedupeKey,
      },
    })

    if (result.error) {
      logger.error("Transactional email send failed.", {
        dedupeKey,
        resendError: redactProviderError(result.error),
        ...context,
      })
      return { sent: false }
    }

    logger.info("Transactional email sent.", {
      dedupeKey,
      providerId: result.data?.id,
      ...context,
    })

    return { sent: true, providerId: result.data?.id }
  } catch (error) {
    logger.error("Transactional email threw unexpectedly.", {
      dedupeKey,
      error: safeErrorMessage(error),
      ...context,
    })
    return { sent: false }
  }
}

export async function sendPurchaseConfirmationEmail(input: {
  to: string
  fullName?: string | null
  productTitle: string
  orderId: string
}): Promise<SendTransactionalEmailResult> {
  const template = buildPurchaseConfirmationTemplate({
    fullName: input.fullName,
    productTitle: input.productTitle,
    orderId: input.orderId,
    dashboardUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/shop`,
  })

  return sendTransactionalEmail({
    to: input.to,
    dedupeKey: `purchase-confirmation:${input.orderId}`,
    template,
    context: {
      emailType: "purchase_confirmation",
      orderId: input.orderId,
      productTitle: input.productTitle,
    },
  })
}

/**
 * @deprecated Prefer membership_lifecycle_events outbox (`membership_started`).
 * Kept for backward-compatible direct sends and tests.
 */
export async function sendMembershipActivatedEmail(input: {
  to: string
  fullName?: string | null
  planName: string
  stripeSubscriptionId: string
}): Promise<SendTransactionalEmailResult> {
  const template = buildMembershipActivatedTemplate({
    fullName: input.fullName,
    planName: input.planName,
    programsUrl: `${env.NEXT_PUBLIC_APP_URL}/programs`,
  })

  return sendTransactionalEmail({
    to: input.to,
    dedupeKey: `membership-activated:${input.stripeSubscriptionId}`,
    template,
    context: {
      emailType: "membership_activated",
      stripeSubscriptionId: input.stripeSubscriptionId,
      planName: input.planName,
    },
  })
}

export async function sendResetCourseAccessGrantedEmail(input: {
  to: string
  fullName?: string | null
  orderId: string
}): Promise<SendTransactionalEmailResult> {
  const template = buildResetAccessGrantedTemplate({
    fullName: input.fullName,
    resetCourseTitle: "The 7-Day Elevated Reset",
    resetCourseUrl: `${env.NEXT_PUBLIC_APP_URL}/programs/7-day-reset-meditation-series`,
  })

  return sendTransactionalEmail({
    to: input.to,
    dedupeKey: `reset-access-granted:${input.orderId}`,
    template,
    context: {
      emailType: "reset_course_access_granted",
      orderId: input.orderId,
    },
  })
}

/**
 * @deprecated Prefer membership_lifecycle_events outbox (`membership_payment_failed`).
 */
export async function sendPaymentFailedEmail(input: {
  to: string
  fullName?: string | null
  planName: string
  stripeInvoiceId: string
}): Promise<SendTransactionalEmailResult> {
  const template = buildPaymentFailedTemplate({
    fullName: input.fullName,
    planName: input.planName,
    billingUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  })

  return sendTransactionalEmail({
    to: input.to,
    dedupeKey: `payment-failed:${input.stripeInvoiceId}`,
    template,
    context: {
      emailType: "payment_failed",
      stripeInvoiceId: input.stripeInvoiceId,
      planName: input.planName,
    },
  })
}

export async function sendCertificateEarnedEmail(input: {
  to: string
  fullName?: string | null
  courseTitle: string
  certificateToken: string
}): Promise<SendTransactionalEmailResult> {
  const template = buildCertificateEarnedTemplate({
    fullName: input.fullName,
    courseTitle: input.courseTitle,
    certificateUrl: `${env.NEXT_PUBLIC_APP_URL}/certificate/verify/${input.certificateToken}`,
  })

  return sendTransactionalEmail({
    to: input.to,
    dedupeKey: `certificate-earned:${input.certificateToken}`,
    template,
    context: {
      emailType: "certificate_earned",
      certificateToken: input.certificateToken,
      courseTitle: input.courseTitle,
    },
  })
}
