import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { env } from "@/lib/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/server/integrations/stripe/client"
import { assertCheckoutUsesTestModeKeys } from "@/server/integrations/stripe/mode"
import { recordMembershipLifecycleEvent } from "@/server/services/membership.service"
import { logger, safeErrorMessage } from "@/server/utils/logger"

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

const userIdSchema = z.uuid()
const planSlugSchema = z.enum(["plan-1", "plan-2", "plan-3"])

const PLAN_RANK: Record<string, number> = {
  "plan-1": 1,
  "plan-2": 2,
  "plan-3": 3,
}

/**
 * Schedule a personal-plan downgrade or cancellation at period end.
 * Upgrades must go through Stripe (proration) and apply only after webhook confirmation.
 */
export async function schedulePersonalPlanChange(input: {
  userId: string
  targetPlanSlug: string
  mode: "downgrade" | "cancel"
}): Promise<ActionResult<{ scheduled: true; effectiveAt: string | null }>> {
  const userId = userIdSchema.safeParse(input.userId)
  if (!userId.success) {
    return failure("validation_error", "Invalid user id.")
  }

  const supabase = createAdminClient()
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(
      "id, plan_id, status, cancel_at_period_end, current_period_end, stripe_subscription_id, plans ( slug )"
    )
    .eq("user_id", userId.data)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !subscription) {
    return failure("not_found", "No active personal subscription found.")
  }

  if (subscription.stripe_subscription_id.startsWith("comp_")) {
    return failure(
      "validation_error",
      "Complimentary memberships are managed by administrators."
    )
  }

  const currentSlug =
    (subscription.plans as { slug?: string } | null)?.slug ?? "plan-1"

  if (input.mode === "cancel") {
    const modeCheck = assertCheckoutUsesTestModeKeys({
      secretKey: env.STRIPE_SECRET_KEY,
      publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    })
    if (!modeCheck.ok) {
      return failure("provider_error", modeCheck.message)
    }

    try {
      const stripe = getStripeClient()
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    } catch (caught) {
      logger.error("Unable to schedule Stripe cancellation.", {
        error: safeErrorMessage(caught),
      })
      return failure("provider_error", "Unable to schedule cancellation with Stripe.")
    }

    await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("id", subscription.id)

    await recordMembershipLifecycleEvent({
      eventType: "membership_cancellation_scheduled",
      sourceEventId: `cancel_schedule:${subscription.id}:${subscription.current_period_end ?? "open"}`,
      userId: userId.data,
      planId: subscription.plan_id,
      effectiveAt: subscription.current_period_end ?? undefined,
    })

    return success({
      scheduled: true,
      effectiveAt: subscription.current_period_end,
    })
  }

  const target = planSlugSchema.safeParse(input.targetPlanSlug)
  if (!target.success) {
    return failure("validation_error", "Invalid target plan.")
  }

  if ((PLAN_RANK[target.data] ?? 0) >= (PLAN_RANK[currentSlug] ?? 0)) {
    return failure(
      "validation_error",
      "Downgrades must target a lower plan. Use upgrade for higher plans."
    )
  }

  const { data: targetPlan } = await supabase
    .from("plans")
    .select("id")
    .eq("slug", target.data)
    .maybeSingle()

  if (!targetPlan) {
    return failure("not_found", "Target plan not found.")
  }

  await supabase
    .from("subscriptions")
    .update({
      scheduled_plan_id: targetPlan.id,
      cancel_at_period_end: false,
    } as never)
    .eq("id", subscription.id)

  await recordMembershipLifecycleEvent({
    eventType: "membership_downgrade_scheduled",
    sourceEventId: `downgrade_schedule:${subscription.id}:${targetPlan.id}:${subscription.current_period_end ?? "open"}`,
    userId: userId.data,
    planId: targetPlan.id,
    effectiveAt: subscription.current_period_end ?? undefined,
    metadata: { fromPlanSlug: currentSlug, toPlanSlug: target.data },
  })

  return success({
    scheduled: true,
    effectiveAt: subscription.current_period_end,
  })
}

/**
 * Preview-only helper: upgrades apply after Stripe confirms successful payment via webhook.
 * This does not mutate local capabilities immediately.
 */
export async function previewPersonalUpgrade(input: {
  userId: string
  targetPlanSlug: string
}): Promise<
  ActionResult<{
    appliesImmediatelyAfterPayment: true
    message: string
  }>
> {
  const target = planSlugSchema.safeParse(input.targetPlanSlug)
  if (!target.success) {
    return failure("validation_error", "Invalid target plan.")
  }

  return success({
    appliesImmediatelyAfterPayment: true,
    message:
      "Upgrades apply only after Stripe confirms successful payment via webhook. Local capabilities do not change on the success page alone.",
  })
}
