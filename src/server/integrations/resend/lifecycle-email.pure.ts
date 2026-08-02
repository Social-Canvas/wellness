/**
 * Pure transactional lifecycle-email helpers (no path aliases).
 * Safe for Node unit tests — same pattern as reset-plan-offer-state.ts.
 */

export const LIFECYCLE_EMAIL_TEMPLATES = [
  "membership_started",
  "membership_upgraded",
  "membership_downgrade_scheduled",
  "membership_downgrade_effective",
  "membership_cancellation_scheduled",
  "membership_cancelled",
  "membership_payment_failed",
  "membership_payment_recovered",
  "organization_member_invited",
  "organization_member_activated",
  "organization_member_tier_changed",
  "organization_member_suspended",
  "organization_member_removed",
] as const

export type LifecycleEmailTemplateId = (typeof LIFECYCLE_EMAIL_TEMPLATES)[number]

export type LifecycleEventType =
  | "membership_started"
  | "membership_upgraded"
  | "membership_downgrade_scheduled"
  | "membership_downgrade_effective"
  | "membership_cancellation_scheduled"
  | "membership_cancelled"
  | "membership_payment_failed"
  | "membership_payment_recovered"
  | "organization_member_invited"
  | "organization_member_activated"
  | "organization_member_suspended"
  | "organization_member_removed"
  | "capability_granted"
  | "capability_revoked"

export type LifecycleEmailMapping = {
  eventType: LifecycleEventType
  template: LifecycleEmailTemplateId | null
  deliver: boolean
  notifyOrgAdmins: boolean
  recipient: "member" | "invite_email" | "none"
  skipReason?: string
  ctaPath: string | null
  ctaMode: "programs" | "billing" | "dashboard" | "signup" | "none"
}

export const LIFECYCLE_EMAIL_MAPPINGS: Record<LifecycleEventType, LifecycleEmailMapping> = {
  membership_started: {
    eventType: "membership_started",
    template: "membership_started",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/programs",
    ctaMode: "programs",
  },
  membership_upgraded: {
    eventType: "membership_upgraded",
    template: "membership_upgraded",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/programs",
    ctaMode: "programs",
  },
  membership_downgrade_scheduled: {
    eventType: "membership_downgrade_scheduled",
    template: "membership_downgrade_scheduled",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/dashboard/account",
    ctaMode: "billing",
  },
  membership_downgrade_effective: {
    eventType: "membership_downgrade_effective",
    template: "membership_downgrade_effective",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/programs",
    ctaMode: "programs",
  },
  membership_cancellation_scheduled: {
    eventType: "membership_cancellation_scheduled",
    template: "membership_cancellation_scheduled",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/dashboard/account",
    ctaMode: "billing",
  },
  membership_cancelled: {
    eventType: "membership_cancelled",
    template: "membership_cancelled",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/programs",
    ctaMode: "programs",
  },
  membership_payment_failed: {
    eventType: "membership_payment_failed",
    template: "membership_payment_failed",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/dashboard/account",
    ctaMode: "billing",
  },
  membership_payment_recovered: {
    eventType: "membership_payment_recovered",
    template: "membership_payment_recovered",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/programs",
    ctaMode: "programs",
  },
  organization_member_invited: {
    eventType: "organization_member_invited",
    template: "organization_member_invited",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "invite_email",
    ctaPath: "/signup",
    ctaMode: "signup",
  },
  organization_member_activated: {
    eventType: "organization_member_activated",
    template: "organization_member_activated",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/dashboard",
    ctaMode: "dashboard",
  },
  organization_member_suspended: {
    eventType: "organization_member_suspended",
    template: "organization_member_suspended",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/dashboard",
    ctaMode: "dashboard",
  },
  organization_member_removed: {
    eventType: "organization_member_removed",
    template: "organization_member_removed",
    deliver: true,
    notifyOrgAdmins: false,
    recipient: "member",
    ctaPath: "/programs",
    ctaMode: "programs",
  },
  capability_granted: {
    eventType: "capability_granted",
    template: null,
    deliver: false,
    notifyOrgAdmins: false,
    recipient: "none",
    skipReason: "capability_events_summarized_in_membership_emails",
    ctaPath: null,
    ctaMode: "none",
  },
  capability_revoked: {
    eventType: "capability_revoked",
    template: null,
    deliver: false,
    notifyOrgAdmins: false,
    recipient: "none",
    skipReason: "capability_events_summarized_in_membership_emails",
    ctaPath: null,
    ctaMode: "none",
  },
}

export type MembershipPrivilegeSummary = {
  hasCourseLibrary: boolean
  canAttendInPerson: boolean
  extraNotes?: string[]
}

export function summarizePrivilegesForPlanSlug(
  planSlug: string | null | undefined
): MembershipPrivilegeSummary {
  switch (planSlug) {
    case "plan-2":
      return { hasCourseLibrary: true, canAttendInPerson: true }
    case "plan-3":
      return {
        hasCourseLibrary: true,
        canAttendInPerson: true,
        extraNotes: [
          "Platinum privileges follow your stored membership capabilities in your account.",
        ],
      }
    case "plan-1":
    default:
      return { hasCourseLibrary: true, canAttendInPerson: false }
  }
}

export function privilegeCopyLines(privileges: MembershipPrivilegeSummary): string[] {
  const lines: string[] = []
  if (privileges.hasCourseLibrary) {
    lines.push("Course library access: included.")
  } else {
    lines.push("Course library access: not included on this membership.")
  }
  if (privileges.canAttendInPerson) {
    lines.push("In-person sessions: included.")
  } else {
    lines.push("In-person sessions: not included.")
  }
  if (privileges.extraNotes?.length) {
    lines.push(...privileges.extraNotes)
  }
  return lines
}

export function getLifecycleEmailMapping(
  eventType: string
): LifecycleEmailMapping | null {
  if (eventType in LIFECYCLE_EMAIL_MAPPINGS) {
    return LIFECYCLE_EMAIL_MAPPINGS[eventType as LifecycleEventType]
  }
  return null
}

export function resolveCta(
  mapping: LifecycleEmailMapping,
  appUrl: string,
  isSponsored: boolean
): { label: string; href: string } | null {
  const base = appUrl.replace(/\/$/, "")
  switch (mapping.ctaMode) {
    case "programs":
      return { label: "Open programs", href: `${base}/programs` }
    case "billing":
      if (isSponsored) {
        return { label: "Open dashboard", href: `${base}/dashboard` }
      }
      return { label: "Manage billing", href: `${base}/dashboard/account` }
    case "dashboard":
      return { label: "Open dashboard", href: `${base}/dashboard` }
    case "signup":
      return { label: "Create your account", href: `${base}/signup` }
    default:
      return null
  }
}

export function requiredPayloadForTemplate(
  templateId: LifecycleEmailTemplateId
): string[] {
  switch (templateId) {
    case "organization_member_invited":
      return ["organizationName", "inviteEmailOrUser"]
    case "organization_member_activated":
    case "organization_member_tier_changed":
    case "organization_member_suspended":
    case "organization_member_removed":
      return ["organizationName", "memberUserId"]
    default:
      return ["memberUserId", "membershipName"]
  }
}

export function buildIdempotencyKey(lifecycleEventId: string, template: string): string {
  return `${lifecycleEventId}:${template}`
}

export function computeEmailBackoffSeconds(attemptCount: number): number {
  const exp = Math.min(12, Math.max(0, attemptCount - 1))
  return Math.min(6 * 60 * 60, 60 * 2 ** exp)
}

export function redactProviderError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Provider error"

  return raw
    .replace(/re_[A-Za-z0-9_]+/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .slice(0, 400)
}

/** Minimal HTML+text shell for contract tests (production templates add full branding). */
export function buildPlainLifecycleEmailParts(input: {
  subject: string
  heading: string
  intro: string
  bodyLines: string[]
  cta: { label: string; href: string }
}): { subject: string; html: string; text: string } {
  const bodyHtml = input.bodyLines
    .map((line) => `<p>${line}</p>`)
    .join("")
  return {
    subject: input.subject,
    html: `<!doctype html><html><body><h1>${input.heading}</h1><p>${input.intro}</p>${bodyHtml}<a href="${input.cta.href}">${input.cta.label}</a></body></html>`,
    text: [input.heading, "", input.intro, ...input.bodyLines, "", `${input.cta.label}: ${input.cta.href}`].join(
      "\n"
    ),
  }
}
