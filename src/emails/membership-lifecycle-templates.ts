import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { renderElevateEmailLayout, renderPlainTextEmail } from "@/emails/elevate-email-layout"
import type { EmailTemplate } from "@/emails/transactional-templates"
import {
  privilegeCopyLines,
  summarizePrivilegesForPlanSlug,
  type MembershipPrivilegeSummary,
} from "@/server/integrations/resend/lifecycle-email.pure"

export type { MembershipPrivilegeSummary }
export { summarizePrivilegesForPlanSlug }

export type LifecycleTemplateInput = {
  firstName?: string | null
  membershipName: string
  organizationName?: string | null
  billingIntervalLabel?: string | null
  amountLabel?: string | null
  effectiveDateLabel?: string | null
  nextRenewalLabel?: string | null
  privileges?: MembershipPrivilegeSummary
  cta: { label: string; href: string }
  supportHint?: string
}

function greetingName(firstName?: string | null): string {
  const trimmed = firstName?.trim()
  return trimmed && trimmed.length > 0 && trimmed.length < 60 ? trimmed : "there"
}

function privilegeLines(privileges?: MembershipPrivilegeSummary): string[] {
  if (!privileges) {
    return []
  }
  return privilegeCopyLines(privileges)
}

function withSupport(outro?: string): string {
  return (
    outro ??
    `Questions? Reply to this email or contact support. — ${ELEVATE_BRAND.name}`
  )
}

function buildTemplate(input: {
  subject: string
  preheader: string
  heading: string
  intro: string
  bodyLines: string[]
  cta: { label: string; href: string }
  outro?: string
}): EmailTemplate {
  return {
    subject: input.subject,
    html: renderElevateEmailLayout({
      preheader: input.preheader,
      heading: input.heading,
      intro: input.intro,
      bodyLines: input.bodyLines,
      cta: input.cta,
      outro: withSupport(input.outro),
    }),
    text: renderPlainTextEmail(input.heading, input.intro, input.bodyLines, input.cta),
  }
}

export function buildMembershipStartedTemplate(input: LifecycleTemplateInput): EmailTemplate {
  const name = greetingName(input.firstName)
  const intro = `Hi ${name}, your ${input.membershipName} membership is now active.`
  const bodyLines = [
    ...(input.billingIntervalLabel
      ? [`Billing: ${input.billingIntervalLabel}`]
      : []),
    ...(input.amountLabel ? [`Amount: ${input.amountLabel}`] : []),
    ...(input.effectiveDateLabel
      ? [`Effective date: ${input.effectiveDateLabel}`]
      : []),
    ...(input.nextRenewalLabel
      ? [`Next renewal: ${input.nextRenewalLabel}`]
      : []),
    ...privilegeLines(input.privileges),
    "Open your programs to begin your next session.",
  ]
  return buildTemplate({
    subject: `Welcome to ${input.membershipName}`,
    preheader: "Your Elevate membership is active.",
    heading: "Membership started",
    intro,
    bodyLines,
    cta: input.cta,
    outro: "Welcome in. We are glad you are here.",
  })
}

export function buildMembershipUpgradedTemplate(input: LifecycleTemplateInput): EmailTemplate {
  const name = greetingName(input.firstName)
  const intro = `Hi ${name}, your membership has been upgraded to ${input.membershipName}.`
  const bodyLines = [
    ...(input.effectiveDateLabel
      ? [`Effective date: ${input.effectiveDateLabel}`]
      : []),
    ...privilegeLines(input.privileges),
  ]
  return buildTemplate({
    subject: `Upgraded to ${input.membershipName}`,
    preheader: "Your Elevate membership upgrade is complete.",
    heading: "Membership upgraded",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildMembershipDowngradeScheduledTemplate(
  input: LifecycleTemplateInput
): EmailTemplate {
  const name = greetingName(input.firstName)
  const intro = `Hi ${name}, your membership change to ${input.membershipName} is scheduled.`
  const bodyLines = [
    input.effectiveDateLabel
      ? `This change takes effect on ${input.effectiveDateLabel}. Until then, your current privileges remain.`
      : "This change takes effect at the end of your current billing period. Until then, your current privileges remain.",
    ...(input.billingIntervalLabel
      ? [`Scheduled billing: ${input.billingIntervalLabel}`]
      : []),
    ...privilegeLines(input.privileges),
  ]
  return buildTemplate({
    subject: "Membership change scheduled",
    preheader: "A membership change is scheduled on your Elevate account.",
    heading: "Downgrade scheduled",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildMembershipDowngradeEffectiveTemplate(
  input: LifecycleTemplateInput
): EmailTemplate {
  const name = greetingName(input.firstName)
  const intro = `Hi ${name}, your membership is now ${input.membershipName}.`
  const bodyLines = [
    ...(input.effectiveDateLabel
      ? [`Effective date: ${input.effectiveDateLabel}`]
      : []),
    ...privilegeLines(input.privileges),
  ]
  return buildTemplate({
    subject: `Now on ${input.membershipName}`,
    preheader: "Your scheduled membership change is now in effect.",
    heading: "Membership updated",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildMembershipCancellationScheduledTemplate(
  input: LifecycleTemplateInput
): EmailTemplate {
  const name = greetingName(input.firstName)
  const intro = `Hi ${name}, your ${input.membershipName} cancellation is scheduled.`
  const bodyLines = [
    input.effectiveDateLabel
      ? input.billingIntervalLabel?.toLowerCase().includes("annual")
        ? `Your annual membership remains active until ${input.effectiveDateLabel}.`
        : `You keep access until ${input.effectiveDateLabel}.`
      : "You keep access until the end of your current billing period.",
    ...(input.billingIntervalLabel
      ? [`Billing: ${input.billingIntervalLabel}`]
      : []),
    "You can manage billing from your account if you change your mind before then.",
  ]
  return buildTemplate({
    subject: "Cancellation scheduled",
    preheader: "Your Elevate membership cancellation is scheduled.",
    heading: "Cancellation scheduled",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildMembershipCancelledTemplate(input: LifecycleTemplateInput): EmailTemplate {
  const name = greetingName(input.firstName)
  const intro = `Hi ${name}, your ${input.membershipName} membership has ended.`
  const bodyLines = [
    ...(input.effectiveDateLabel
      ? [`Effective date: ${input.effectiveDateLabel}`]
      : []),
    "Member library and in-person privileges tied to this membership are no longer available.",
    "You can rejoin anytime from the membership page.",
  ]
  return buildTemplate({
    subject: "Membership cancelled",
    preheader: "Your Elevate membership has ended.",
    heading: "Membership cancelled",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildMembershipPaymentFailedTemplate(
  input: LifecycleTemplateInput
): EmailTemplate {
  const name = greetingName(input.firstName)
  const intro = `Hi ${name}, we could not process a payment for your ${input.membershipName} membership.`
  const bodyLines = [
    "Please update your payment method to avoid an interruption to your access.",
    "Stripe also sends payment receipts and invoice notices directly — this message is an Elevate access reminder only.",
  ]
  return buildTemplate({
    subject: "Payment failed — action needed",
    preheader: "Action needed to keep your membership active.",
    heading: "Payment failed",
    intro,
    bodyLines,
    cta: input.cta,
    outro: "If this is already resolved, you can ignore this email.",
  })
}

export function buildMembershipPaymentRecoveredTemplate(
  input: LifecycleTemplateInput
): EmailTemplate {
  const name = greetingName(input.firstName)
  const intro = `Hi ${name}, your ${input.membershipName} payment succeeded and your membership is in good standing.`
  const bodyLines = [
    ...(input.effectiveDateLabel
      ? [`Effective date: ${input.effectiveDateLabel}`]
      : []),
    ...privilegeLines(input.privileges),
  ]
  return buildTemplate({
    subject: "Payment recovered — membership active",
    preheader: "Your Elevate membership payment is up to date.",
    heading: "Payment recovered",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildOrgMemberInvitedTemplate(input: LifecycleTemplateInput): EmailTemplate {
  const name = greetingName(input.firstName)
  const org = input.organizationName?.trim() || "your organization"
  const intro = `Hi ${name}, you have been invited to Elevate through ${org}.`
  const bodyLines = [
    input.membershipName
      ? `Sponsored membership: ${input.membershipName}.`
      : "Your organization has sponsored Elevate access for you.",
    ...privilegeLines(input.privileges),
    "Accept the invitation to activate your access.",
  ]
  return buildTemplate({
    subject: `You're invited to Elevate via ${org}`,
    preheader: "Your organization invited you to Elevate.",
    heading: "Organization invitation",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildOrgMemberActivatedTemplate(input: LifecycleTemplateInput): EmailTemplate {
  const name = greetingName(input.firstName)
  const org = input.organizationName?.trim() || "your organization"
  const intro = `Hi ${name}, your Elevate access through ${org} is now active.`
  const bodyLines = [
    `Membership: ${input.membershipName}.`,
    ...privilegeLines(input.privileges),
  ]
  return buildTemplate({
    subject: `Elevate access activated via ${org}`,
    preheader: "Your sponsored Elevate access is active.",
    heading: "Sponsored access activated",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildOrgMemberTierChangedTemplate(input: LifecycleTemplateInput): EmailTemplate {
  const name = greetingName(input.firstName)
  const org = input.organizationName?.trim() || "your organization"
  const intro = `Hi ${name}, your Elevate membership through ${org} is now ${input.membershipName}.`
  const bodyLines = [
    ...(input.effectiveDateLabel
      ? [`Effective date: ${input.effectiveDateLabel}`]
      : []),
    ...privilegeLines(input.privileges),
  ]
  return buildTemplate({
    subject: `Membership updated via ${org}`,
    preheader: "Your sponsored Elevate membership was updated.",
    heading: "Sponsored membership updated",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildOrgMemberSuspendedTemplate(input: LifecycleTemplateInput): EmailTemplate {
  const name = greetingName(input.firstName)
  const org = input.organizationName?.trim() || "your organization"
  const intro = `Hi ${name}, your Elevate access through ${org} has been suspended.`
  const bodyLines = [
    "Sponsored member privileges are paused while this status remains.",
    "Contact your organization administrator if you believe this is unexpected.",
  ]
  return buildTemplate({
    subject: "Sponsored access suspended",
    preheader: "Your sponsored Elevate access was suspended.",
    heading: "Access suspended",
    intro,
    bodyLines,
    cta: input.cta,
  })
}

export function buildOrgMemberRemovedTemplate(input: LifecycleTemplateInput): EmailTemplate {
  const name = greetingName(input.firstName)
  const org = input.organizationName?.trim() || "your organization"
  const intro = `Hi ${name}, your Elevate access through ${org} has ended.`
  const bodyLines = [
    ...(input.effectiveDateLabel
      ? [`Effective date: ${input.effectiveDateLabel}`]
      : []),
    "Sponsored member privileges from this organization are no longer available.",
    "You may still have separate personal Elevate access if you purchased a membership.",
  ]
  return buildTemplate({
    subject: "Sponsored access ended",
    preheader: "Your sponsored Elevate access has ended.",
    heading: "Access removed",
    intro,
    bodyLines,
    cta: input.cta,
  })
}
