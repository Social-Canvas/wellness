import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import { logger, safeErrorMessage } from "@/server/utils/logger"

import { getResendClient } from "./client"
import {
  getTransactionalEmailConfig,
  isRecipientAllowed,
  validateTransactionalSender,
} from "./email-config"
import {
  buildIdempotencyKey,
  computeEmailBackoffSeconds,
  redactProviderError,
} from "./lifecycle-email.pure"
import {
  getLifecycleEmailMapping,
  renderLifecycleEmailTemplate,
  type LifecycleEmailTemplateId,
} from "./lifecycle-email-mapping"

type AdminClient = SupabaseClient

type LifecycleEmailRow = {
  id: string
  event_type: string
  user_id: string | null
  organization_id: string | null
  plan_id: string | null
  effective_at: string
  metadata: Record<string, unknown> | null
  email_status: string
  email_attempt_count: number
  email_template: string | null
  email_recipient_user_id: string | null
  email_provider_message_id: string | null
}

export type OutboxProcessResult = {
  claimed: number
  sent: number
  skipped: number
  retry: number
  failed: number
  /** Never include emails or PII */
  errors: Array<{ code: string; count: number }>
}

function adminDb(): AdminClient {
  return createAdminClient() as unknown as AdminClient
}

function formatDateLabel(iso: string | null | undefined): string | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function firstNameFromFullName(fullName: string | null | undefined): string | null {
  if (!fullName?.trim()) {
    return null
  }
  return fullName.trim().split(/\s+/)[0] ?? null
}

async function markEmailState(
  supabase: AdminClient,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("membership_lifecycle_events")
    .update(patch)
    .eq("id", id)

  if (error) {
    logger.error("Failed to update lifecycle email state.", {
      eventId: id,
      error: safeErrorMessage(error),
    })
  }
}

async function resolveMemberProfile(
  supabase: AdminClient,
  userId: string | null
): Promise<{ id: string; email: string; fullName: string | null } | null> {
  if (!userId) {
    return null
  }
  const parsed = z.uuid().safeParse(userId)
  if (!parsed.success) {
    return null
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, auth_user_id")
    .eq("id", parsed.data)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const row = data as {
    id: string
    email: string
    full_name: string | null
    auth_user_id: string
  }

  // Prefer Auth-verified email when available.
  try {
    const { data: authData } = await supabase.auth.admin.getUserById(row.auth_user_id)
    const authEmail = authData.user?.email?.trim().toLowerCase()
    if (authEmail) {
      return { id: row.id, email: authEmail, fullName: row.full_name }
    }
  } catch {
    // Fall back to profile email
  }

  if (!row.email?.trim()) {
    return null
  }

  return { id: row.id, email: row.email.trim().toLowerCase(), fullName: row.full_name }
}

async function resolvePlanContext(
  supabase: AdminClient,
  planId: string | null,
  metadata: Record<string, unknown> | null
): Promise<{ name: string; slug: string | null }> {
  if (planId) {
    const { data } = await supabase
      .from("plans")
      .select("name, slug")
      .eq("id", planId)
      .maybeSingle()
    if (data) {
      const row = data as { name: string; slug: string }
      return { name: row.name, slug: row.slug }
    }
  }

  const metaName =
    typeof metadata?.planName === "string" ? metadata.planName : null
  const metaSlug =
    typeof metadata?.planSlug === "string" ? metadata.planSlug : null
  return { name: metaName ?? "Elevate membership", slug: metaSlug }
}

async function resolveOrganizationName(
  supabase: AdminClient,
  organizationId: string | null,
  metadata: Record<string, unknown> | null
): Promise<string | null> {
  if (typeof metadata?.organizationName === "string") {
    return metadata.organizationName
  }
  if (!organizationId) {
    return null
  }
  const { data } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle()
  return data ? (data as { name: string }).name : null
}

async function resolveUserIdFromStripeSubscription(
  supabase: AdminClient,
  metadata: Record<string, unknown> | null
): Promise<string | null> {
  const stripeSubscriptionId =
    typeof metadata?.stripeSubscriptionId === "string"
      ? metadata.stripeSubscriptionId
      : null
  if (!stripeSubscriptionId) {
    return null
  }
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle()
  return data ? (data as { user_id: string }).user_id : null
}

function bumpError(
  errors: OutboxProcessResult["errors"],
  code: string
): void {
  const existing = errors.find((entry) => entry.code === code)
  if (existing) {
    existing.count += 1
  } else {
    errors.push({ code, count: 1 })
  }
}

async function claimBatch(
  supabase: AdminClient,
  limit: number
): Promise<LifecycleEmailRow[]> {
  const { data, error } = await supabase.rpc("claim_lifecycle_email_batch", {
    p_limit: limit,
  })

  if (error) {
    logger.error("claim_lifecycle_email_batch failed.", {
      error: safeErrorMessage(error),
    })
    return []
  }

  return (data ?? []) as LifecycleEmailRow[]
}

async function processClaimedEvent(
  supabase: AdminClient,
  row: LifecycleEmailRow,
  result: OutboxProcessResult
): Promise<void> {
  const config = getTransactionalEmailConfig()
  const mapping = getLifecycleEmailMapping(row.event_type)

  if (!mapping || !mapping.deliver || !mapping.template) {
    await markEmailState(supabase, row.id, {
      email_status: "skipped",
      email_locked_at: null,
      email_last_error: mapping?.skipReason ?? "unmapped_or_non_deliverable_event",
      email_template: null,
    })
    result.skipped += 1
    bumpError(result.errors, mapping?.skipReason ?? "unmapped")
    return
  }

  // Local sent is the canonical duplicate guard.
  if (row.email_status === "sent" || row.email_provider_message_id) {
    await markEmailState(supabase, row.id, {
      email_status: "sent",
      email_locked_at: null,
    })
    result.skipped += 1
    bumpError(result.errors, "already_sent")
    return
  }

  const sender = validateTransactionalSender(config)
  if (!sender.ok) {
    if (sender.permanent || row.email_attempt_count >= config.maxAttempts) {
      await markEmailState(supabase, row.id, {
        email_status: "failed",
        email_locked_at: null,
        email_last_error: redactProviderError(sender.reason),
        email_template: mapping.template,
      })
      result.failed += 1
      bumpError(result.errors, "sender_invalid")
      return
    }

    const delay = computeEmailBackoffSeconds(row.email_attempt_count)
    await markEmailState(supabase, row.id, {
      email_status: "retry",
      email_locked_at: null,
      email_next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(),
      email_last_error: redactProviderError(sender.reason),
      email_template: mapping.template,
    })
    result.retry += 1
    bumpError(result.errors, "sender_not_ready")
    return
  }

  let recipientUserId = row.email_recipient_user_id ?? row.user_id
  if (!recipientUserId) {
    recipientUserId = await resolveUserIdFromStripeSubscription(
      supabase,
      row.metadata
    )
  }

  const metadata = (row.metadata ?? {}) as Record<string, unknown>
  const inviteEmail =
    typeof metadata.email === "string" ? metadata.email.trim().toLowerCase() : null

  let toEmail: string | null = null
  let firstName: string | null = null

  if (mapping.recipient === "invite_email") {
    if (recipientUserId) {
      const profile = await resolveMemberProfile(supabase, recipientUserId)
      if (profile) {
        toEmail = profile.email
        firstName = firstNameFromFullName(profile.fullName)
      }
    }
    if (!toEmail && inviteEmail && z.email().safeParse(inviteEmail).success) {
      toEmail = inviteEmail
    }
    if (!toEmail) {
      await markEmailState(supabase, row.id, {
        email_status: "skipped",
        email_locked_at: null,
        email_last_error: "missing_invite_recipient",
        email_template: mapping.template,
      })
      result.skipped += 1
      bumpError(result.errors, "missing_invite_recipient")
      return
    }
  } else if (mapping.recipient === "member") {
    const profile = await resolveMemberProfile(supabase, recipientUserId)
    if (!profile) {
      await markEmailState(supabase, row.id, {
        email_status: "skipped",
        email_locked_at: null,
        email_last_error: "missing_member_recipient",
        email_template: mapping.template,
      })
      result.skipped += 1
      bumpError(result.errors, "missing_member_recipient")
      return
    }
    toEmail = profile.email
    firstName = firstNameFromFullName(profile.fullName)
    recipientUserId = profile.id
  } else {
    await markEmailState(supabase, row.id, {
      email_status: "skipped",
      email_locked_at: null,
      email_last_error: "no_recipient_policy",
      email_template: mapping.template,
    })
    result.skipped += 1
    bumpError(result.errors, "no_recipient_policy")
    return
  }

  const allow = isRecipientAllowed(toEmail, config)
  if (!allow.allowed) {
    await markEmailState(supabase, row.id, {
      email_status: "skipped",
      email_locked_at: null,
      email_last_error: allow.reason ?? "recipient_blocked",
      email_template: mapping.template,
      email_recipient_user_id: recipientUserId,
    })
    result.skipped += 1
    bumpError(result.errors, allow.reason ?? "recipient_blocked")
    return
  }

  const plan = await resolvePlanContext(supabase, row.plan_id, metadata)
  const organizationName = await resolveOrganizationName(
    supabase,
    row.organization_id,
    metadata
  )
  const isSponsored =
    mapping.eventType.startsWith("organization_") ||
    metadata.accessSource === "nonprofit_sponsored"

  const templateId = mapping.template as LifecycleEmailTemplateId
  const rendered = renderLifecycleEmailTemplate(templateId, {
    appUrl: config.appUrl,
    firstName,
    membershipName: plan.name,
    organizationName,
    planSlug: plan.slug,
    effectiveDateLabel: formatDateLabel(row.effective_at),
    isSponsored: Boolean(isSponsored),
  })

  const idempotencyKey = buildIdempotencyKey(row.id, templateId)

  try {
    const resend = getResendClient()
    const sendResult = await resend.emails.send({
      from: sender.fromHeader,
      to: toEmail,
      ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "X-Elevate-Dedupe-Key": idempotencyKey,
        "X-Elevate-Lifecycle-Event-Id": row.id,
      },
    })

    if (sendResult.error) {
      const redacted = redactProviderError(sendResult.error)
      const permanent =
        /invalid|validation|forbidden|not.?verif/i.test(redacted) &&
        !/rate|timeout|temporar|network|5\d\d/i.test(redacted)

      if (permanent || row.email_attempt_count >= config.maxAttempts) {
        await markEmailState(supabase, row.id, {
          email_status: "failed",
          email_locked_at: null,
          email_last_error: redacted,
          email_template: templateId,
          email_recipient_user_id: recipientUserId,
        })
        result.failed += 1
        bumpError(result.errors, "provider_permanent")
        return
      }

      const delay = computeEmailBackoffSeconds(row.email_attempt_count)
      await markEmailState(supabase, row.id, {
        email_status: "retry",
        email_locked_at: null,
        email_next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(),
        email_last_error: redacted,
        email_template: templateId,
        email_recipient_user_id: recipientUserId,
      })
      result.retry += 1
      bumpError(result.errors, "provider_transient")
      return
    }

    await markEmailState(supabase, row.id, {
      email_status: "sent",
      email_sent_at: new Date().toISOString(),
      email_locked_at: null,
      email_next_attempt_at: null,
      email_provider_message_id: sendResult.data?.id ?? null,
      email_last_error: null,
      email_template: templateId,
      email_recipient_user_id: recipientUserId,
    })
    result.sent += 1

    logger.info("Lifecycle transactional email sent.", {
      eventId: row.id,
      template: templateId,
      providerId: sendResult.data?.id,
    })
  } catch (error) {
    const redacted = redactProviderError(error)
    if (row.email_attempt_count >= config.maxAttempts) {
      await markEmailState(supabase, row.id, {
        email_status: "failed",
        email_locked_at: null,
        email_last_error: redacted,
        email_template: templateId,
        email_recipient_user_id: recipientUserId,
      })
      result.failed += 1
      bumpError(result.errors, "send_exception_exhausted")
      return
    }

    const delay = computeEmailBackoffSeconds(row.email_attempt_count)
    await markEmailState(supabase, row.id, {
      email_status: "retry",
      email_locked_at: null,
      email_next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(),
      email_last_error: redacted,
      email_template: templateId,
      email_recipient_user_id: recipientUserId,
    })
    result.retry += 1
    bumpError(result.errors, "send_exception")
  }
}

/**
 * Claim and process a batch of lifecycle email outbox rows.
 * Email failures never revoke membership access — this function only mutates email_* fields.
 */
export async function processLifecycleEmailOutbox(options?: {
  limit?: number
}): Promise<OutboxProcessResult> {
  const config = getTransactionalEmailConfig()
  const limit = options?.limit ?? config.batchSize
  const supabase = adminDb()
  const result: OutboxProcessResult = {
    claimed: 0,
    sent: 0,
    skipped: 0,
    retry: 0,
    failed: 0,
    errors: [],
  }

  const claimed = await claimBatch(supabase, limit)
  result.claimed = claimed.length

  for (const row of claimed) {
    try {
      await processClaimedEvent(supabase, row, result)
    } catch (error) {
      logger.error("Unexpected outbox item failure (access unchanged).", {
        eventId: row.id,
        error: safeErrorMessage(error),
      })
      const delay = computeEmailBackoffSeconds(row.email_attempt_count || 1)
      await markEmailState(supabase, row.id, {
        email_status: "retry",
        email_locked_at: null,
        email_next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(),
        email_last_error: redactProviderError(error),
      })
      result.retry += 1
      bumpError(result.errors, "unexpected")
    }
  }

  return result
}

/**
 * Best-effort immediate delivery after enqueue. Never throws into callers.
 */
export async function tryProcessLifecycleEmailImmediately(
  eventId?: string | null
): Promise<void> {
  try {
    if (eventId) {
      // Re-open a single pending row for immediate attempt by clearing lock window.
      const supabase = adminDb()
      await supabase
        .from("membership_lifecycle_events")
        .update({
          email_status: "pending",
          email_next_attempt_at: null,
          email_locked_at: null,
        })
        .eq("id", eventId)
        .in("email_status", ["pending", "retry"])
    }
    await processLifecycleEmailOutbox({ limit: eventId ? 1 : 5 })
  } catch (error) {
    logger.warn("Immediate lifecycle email processing failed (non-blocking).", {
      error: safeErrorMessage(error),
    })
  }
}
