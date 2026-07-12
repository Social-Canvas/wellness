import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { renderElevateEmailLayout, renderPlainTextEmail } from "@/emails/elevate-email-layout"

type EmailTemplate = {
  subject: string
  html: string
  text: string
}

export function buildPurchaseConfirmationTemplate(input: {
  fullName?: string | null
  productTitle: string
  orderId: string
  dashboardUrl: string
}): EmailTemplate {
  const recipient = input.fullName?.trim() || "there"
  const intro = `Hi ${recipient}, your purchase is confirmed.`
  const bodyLines = [
    `Product: ${input.productTitle}`,
    `Order ID: ${input.orderId}`,
    "Your files and resources are available from your dashboard.",
  ]

  return {
    subject: `Purchase confirmed - ${input.productTitle}`,
    html: renderElevateEmailLayout({
      preheader: "Your Elevate purchase is confirmed.",
      heading: "Purchase confirmed",
      intro,
      bodyLines,
      cta: { label: "Open dashboard", href: input.dashboardUrl },
      outro: `With care, ${ELEVATE_BRAND.founder}`,
    }),
    text: renderPlainTextEmail("Purchase confirmed", intro, bodyLines, {
      label: "Open dashboard",
      href: input.dashboardUrl,
    }),
  }
}

export function buildMembershipActivatedTemplate(input: {
  fullName?: string | null
  planName: string
  programsUrl: string
}): EmailTemplate {
  const recipient = input.fullName?.trim() || "there"
  const intro = `Hi ${recipient}, your ${input.planName} membership is now active.`
  const bodyLines = [
    "You now have access to your eligible programs and member resources.",
    "Open your program library to begin your next session.",
  ]

  return {
    subject: `${input.planName} membership activated`,
    html: renderElevateEmailLayout({
      preheader: "Your Elevate membership is active.",
      heading: "Membership activated",
      intro,
      bodyLines,
      cta: { label: "Open programs", href: input.programsUrl },
      outro: "Welcome in. We are glad you are here.",
    }),
    text: renderPlainTextEmail("Membership activated", intro, bodyLines, {
      label: "Open programs",
      href: input.programsUrl,
    }),
  }
}

export function buildResetAccessGrantedTemplate(input: {
  fullName?: string | null
  resetCourseTitle: string
  resetCourseUrl: string
}): EmailTemplate {
  const recipient = input.fullName?.trim() || "there"
  const intro = `Hi ${recipient}, your Reset course access is ready.`
  const bodyLines = [
    `Course unlocked: ${input.resetCourseTitle}`,
    "Start with the welcome lesson and follow the daily practice sequence.",
  ]

  return {
    subject: "Reset course access granted",
    html: renderElevateEmailLayout({
      preheader: "Your 7-Day Elevated Reset access is available.",
      heading: "Reset access granted",
      intro,
      bodyLines,
      cta: { label: "Start Reset course", href: input.resetCourseUrl },
      outro: `In your corner, ${ELEVATE_BRAND.founder}`,
    }),
    text: renderPlainTextEmail("Reset access granted", intro, bodyLines, {
      label: "Start Reset course",
      href: input.resetCourseUrl,
    }),
  }
}

export function buildPaymentFailedTemplate(input: {
  fullName?: string | null
  planName: string
  billingUrl: string
}): EmailTemplate {
  const recipient = input.fullName?.trim() || "there"
  const intro = `Hi ${recipient}, we could not process your latest payment for ${input.planName}.`
  const bodyLines = [
    "Please update your payment method to avoid an interruption to your access.",
    "Stripe also sends payment receipts and invoice notices directly.",
  ]

  return {
    subject: "Payment failed - action needed",
    html: renderElevateEmailLayout({
      preheader: "Action needed to keep your membership active.",
      heading: "Payment failed",
      intro,
      bodyLines,
      cta: { label: "Update billing details", href: input.billingUrl },
      outro: "If this is already resolved, you can ignore this email.",
    }),
    text: renderPlainTextEmail("Payment failed", intro, bodyLines, {
      label: "Update billing details",
      href: input.billingUrl,
    }),
  }
}

export function buildCertificateEarnedTemplate(input: {
  fullName?: string | null
  courseTitle: string
  certificateUrl: string
}): EmailTemplate {
  const recipient = input.fullName?.trim() || "there"
  const intro = `Hi ${recipient}, congratulations on completing ${input.courseTitle}.`
  const bodyLines = [
    "Your certificate has been issued and is now available in your dashboard.",
    "Keep this milestone as a marker of your progress.",
  ]

  return {
    subject: `Certificate earned - ${input.courseTitle}`,
    html: renderElevateEmailLayout({
      preheader: "Your Elevate certificate is ready.",
      heading: "Certificate earned",
      intro,
      bodyLines,
      cta: { label: "View certificate", href: input.certificateUrl },
      outro: `Proud of your progress, ${ELEVATE_BRAND.founder}`,
    }),
    text: renderPlainTextEmail("Certificate earned", intro, bodyLines, {
      label: "View certificate",
      href: input.certificateUrl,
    }),
  }
}

export type { EmailTemplate }
