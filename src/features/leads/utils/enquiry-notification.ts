import {
  renderElevateEmailLayout,
  renderPlainTextEmail,
} from "@/emails/elevate-email-layout"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

export type EnquiryEmailTemplate = {
  subject: string
  html: string
  text: string
}

export type EnquiryEmailSendResult = {
  status: "sent" | "failed" | "skipped"
  providerId?: string
  errorSummary?: string
}

export type EnquiryLeadSnapshot = {
  id: string
  leadType: string
  name: string
  email: string
  phone: string | null
  organizationName: string | null
  estimatedParticipants: string | null
  interest: string | null
  message: string | null
  source: string | null
  createdAt: string
}

function safeLine(label: string, value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  // Strip control characters; HTML escaping is applied by the email layout.
  const cleaned = trimmed.replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 4000)
  return `${label}: ${cleaned}`
}

/**
 * Build admin notification content. User-supplied values are escaped for HTML.
 */
export function buildEnquiryAdminNotificationTemplate(
  lead: EnquiryLeadSnapshot
): EnquiryEmailTemplate {
  const lines = [
    safeLine("Type", lead.leadType),
    safeLine("Name", lead.name),
    safeLine("Email", lead.email),
    safeLine("Phone", lead.phone),
    safeLine("Organization", lead.organizationName),
    safeLine("Estimated participants", lead.estimatedParticipants),
    safeLine("Interest", lead.interest),
    safeLine("Source", lead.source),
    safeLine("Lead ID", lead.id),
    safeLine("Submitted at", lead.createdAt),
    safeLine("Message", lead.message),
  ].filter((line): line is string => Boolean(line))

  const intro = `A new Elevate enquiry (${lead.leadType}) was submitted.`
  const subject = `New Elevate enquiry: ${lead.leadType}`

  return {
    subject,
    html: renderElevateEmailLayout({
      preheader: `New ${lead.leadType} enquiry from ${lead.name}`,
      heading: "New enquiry received",
      intro,
      bodyLines: lines,
      outro: "Reply to this email to respond directly to the submitter.",
    }),
    text: renderPlainTextEmail("New enquiry received", intro, lines),
  }
}

export function buildEnquiryVisitorAcknowledgementTemplate(input: {
  name: string
}): EnquiryEmailTemplate {
  const recipient = input.name.trim() || "there"
  const intro = `Hi ${recipient}, we received your Elevate enquiry.`
  const bodyLines = [
    "Thank you for getting in touch. The Elevate team will review your message and follow up shortly.",
    "This is a confirmation only — you have not been added to a marketing list.",
  ]

  return {
    subject: "We received your Elevate enquiry",
    html: renderElevateEmailLayout({
      preheader: "We received your Elevate enquiry.",
      heading: "Enquiry received",
      intro,
      bodyLines,
      outro: `With care, ${ELEVATE_BRAND.founder}`,
    }),
    text: renderPlainTextEmail("Enquiry received", intro, bodyLines),
  }
}
