import {
  buildMembershipCancelledTemplate,
  buildMembershipCancellationScheduledTemplate,
  buildMembershipDowngradeEffectiveTemplate,
  buildMembershipDowngradeScheduledTemplate,
  buildMembershipPaymentFailedTemplate,
  buildMembershipPaymentRecoveredTemplate,
  buildMembershipStartedTemplate,
  buildMembershipUpgradedTemplate,
  buildOrgMemberActivatedTemplate,
  buildOrgMemberInvitedTemplate,
  buildOrgMemberRemovedTemplate,
  buildOrgMemberSuspendedTemplate,
  buildOrgMemberTierChangedTemplate,
  type LifecycleTemplateInput,
} from "@/emails/membership-lifecycle-templates"
import type { EmailTemplate } from "@/emails/transactional-templates"

import {
  getLifecycleEmailMapping,
  resolveCta,
  summarizePrivilegesForPlanSlug,
  type LifecycleEmailTemplateId,
} from "./lifecycle-email.pure"

export {
  LIFECYCLE_EMAIL_MAPPINGS,
  LIFECYCLE_EMAIL_TEMPLATES,
  getLifecycleEmailMapping,
  requiredPayloadForTemplate,
  resolveCta,
  summarizePrivilegesForPlanSlug,
  type LifecycleEmailMapping,
  type LifecycleEmailTemplateId,
  type LifecycleEventType,
} from "./lifecycle-email.pure"

export type RenderLifecycleEmailContext = {
  appUrl: string
  firstName?: string | null
  membershipName: string
  organizationName?: string | null
  planSlug?: string | null
  billingIntervalLabel?: string | null
  amountLabel?: string | null
  effectiveDateLabel?: string | null
  nextRenewalLabel?: string | null
  isSponsored?: boolean
  forceTemplate?: LifecycleEmailTemplateId
}

export function renderLifecycleEmailTemplate(
  templateId: LifecycleEmailTemplateId,
  context: RenderLifecycleEmailContext
): EmailTemplate {
  const privileges = summarizePrivilegesForPlanSlug(context.planSlug)
  const mapping =
    getLifecycleEmailMapping(
      templateId === "organization_member_tier_changed"
        ? "organization_member_activated"
        : templateId
    ) ?? getLifecycleEmailMapping("membership_started")

  if (!mapping) {
    throw new Error("Missing lifecycle email mapping.")
  }

  const cta =
    resolveCta(
      {
        ...mapping,
        ctaMode:
          templateId === "organization_member_invited"
            ? "signup"
            : templateId.includes("payment_failed") ||
                templateId.includes("cancellation") ||
                templateId.includes("downgrade_scheduled")
              ? "billing"
              : mapping.ctaMode,
      },
      context.appUrl,
      Boolean(context.isSponsored)
    ) ?? { label: "Open Elevate", href: context.appUrl }

  const input: LifecycleTemplateInput = {
    firstName: context.firstName,
    membershipName: context.membershipName,
    organizationName: context.organizationName,
    billingIntervalLabel: context.billingIntervalLabel,
    amountLabel: context.amountLabel,
    effectiveDateLabel: context.effectiveDateLabel,
    nextRenewalLabel: context.nextRenewalLabel,
    privileges,
    cta,
  }

  switch (templateId) {
    case "membership_started":
      return buildMembershipStartedTemplate(input)
    case "membership_upgraded":
      return buildMembershipUpgradedTemplate(input)
    case "membership_downgrade_scheduled":
      return buildMembershipDowngradeScheduledTemplate(input)
    case "membership_downgrade_effective":
      return buildMembershipDowngradeEffectiveTemplate(input)
    case "membership_cancellation_scheduled":
      return buildMembershipCancellationScheduledTemplate(input)
    case "membership_cancelled":
      return buildMembershipCancelledTemplate(input)
    case "membership_payment_failed":
      return buildMembershipPaymentFailedTemplate(input)
    case "membership_payment_recovered":
      return buildMembershipPaymentRecoveredTemplate(input)
    case "organization_member_invited":
      return buildOrgMemberInvitedTemplate(input)
    case "organization_member_activated":
      return buildOrgMemberActivatedTemplate(input)
    case "organization_member_tier_changed":
      return buildOrgMemberTierChangedTemplate(input)
    case "organization_member_suspended":
      return buildOrgMemberSuspendedTemplate(input)
    case "organization_member_removed":
      return buildOrgMemberRemovedTemplate(input)
    default: {
      const _exhaustive: never = templateId
      return _exhaustive
    }
  }
}
