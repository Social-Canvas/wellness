import "server-only"

import type Stripe from "stripe"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { classifyMembershipBillingChange } from "@/features/checkout/utils/membership-plan-cta-state"
import { env } from "@/lib/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/server/integrations/stripe/client"
import { assertCheckoutUsesMatchedModeKeys } from "@/server/integrations/stripe/mode"
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
const intervalSchema = z.enum(["monthly", "yearly"])

const PLAN_RANK: Record<string, number> = {
  "plan-1": 1,
  "plan-2": 2,
  "plan-3": 3,
}

type PersonalSubscriptionRow = {
  id: string
  plan_id: string
  status: string
  cancel_at_period_end: boolean
  current_period_end: string | null
  stripe_subscription_id: string
  stripe_price_id: string
  scheduled_plan_id: string | null
  scheduled_billing_interval: "monthly" | "yearly" | null
  plans: { slug?: string; name?: string } | null
}

async function loadPersonalSubscription(
  userId: string
): Promise<ActionResult<PersonalSubscriptionRow>> {
  const supabase = createAdminClient()
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(
      "id, plan_id, status, cancel_at_period_end, current_period_end, stripe_subscription_id, stripe_price_id, scheduled_plan_id, scheduled_billing_interval, plans!plan_id ( slug, name )"
    )
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !subscription) {
    return failure("not_found", "No active personal subscription found.")
  }

  return success(subscription as unknown as PersonalSubscriptionRow)
}

async function resolvePlanPrice(input: {
  planSlug: "plan-1" | "plan-2" | "plan-3"
  interval: "monthly" | "yearly"
}): Promise<
  ActionResult<{
    id: string
    planId: string
    stripePriceId: string
    amount: number
    currency: string
    billingInterval: "monthly" | "yearly"
  }>
> {
  const supabase = createAdminClient()
  const { data: plan } = await supabase
    .from("plans")
    .select("id, slug")
    .eq("slug", input.planSlug)
    .maybeSingle()

  if (!plan) {
    return failure("not_found", "Target plan not found.")
  }

  const { data: planPrice } = await supabase
    .from("plan_prices")
    .select(
      "id, plan_id, stripe_price_id, amount, currency, billing_interval, is_active"
    )
    .eq("plan_id", plan.id)
    .eq("billing_interval", input.interval)
    .eq("is_active", true)
    .maybeSingle()

  if (!planPrice || !planPrice.is_active) {
    return failure("not_found", "Target plan price not found.")
  }

  if (
    !planPrice.stripe_price_id.startsWith("price_") ||
    planPrice.stripe_price_id.startsWith("price_placeholder_")
  ) {
    return failure(
      "provider_error",
      "This billing option is not configured with a Stripe Price yet."
    )
  }

  return success({
    id: planPrice.id,
    planId: plan.id,
    stripePriceId: planPrice.stripe_price_id,
    amount: planPrice.amount,
    currency: planPrice.currency,
    billingInterval: planPrice.billing_interval,
  })
}

/**
 * Schedule a personal-plan downgrade or cancellation at period end.
 * Upgrades must go through Stripe (proration) and apply only after webhook confirmation.
 */
export async function schedulePersonalPlanChange(input: {
  userId: string
  targetPlanSlug: string
  mode: "downgrade" | "cancel"
  targetBillingInterval?: "monthly" | "yearly"
}): Promise<ActionResult<{ scheduled: true; effectiveAt: string | null }>> {
  const userId = userIdSchema.safeParse(input.userId)
  if (!userId.success) {
    return failure("validation_error", "Invalid user id.")
  }

  const subscriptionResult = await loadPersonalSubscription(userId.data)
  if (!subscriptionResult.success) {
    return subscriptionResult
  }
  const subscription = subscriptionResult.data

  if (subscription.stripe_subscription_id.startsWith("comp_")) {
    return failure(
      "validation_error",
      "Complimentary memberships are managed by administrators."
    )
  }

  const currentSlug = subscription.plans?.slug ?? "plan-1"

  if (input.mode === "cancel") {
    const modeCheck = assertCheckoutUsesMatchedModeKeys({
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

    const supabase = createAdminClient()
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

  const parsedInterval = intervalSchema.safeParse(input.targetBillingInterval)
  const targetInterval = parsedInterval.success ? parsedInterval.data : undefined

  const { data: targetPlan } = await createAdminClient()
    .from("plans")
    .select("id")
    .eq("slug", target.data)
    .maybeSingle()

  if (!targetPlan) {
    return failure("not_found", "Target plan not found.")
  }

  await createAdminClient()
    .from("subscriptions")
    .update({
      scheduled_plan_id: targetPlan.id,
      scheduled_billing_interval: targetInterval ?? null,
      cancel_at_period_end: false,
    } as never)
    .eq("id", subscription.id)

  await recordMembershipLifecycleEvent({
    eventType: "membership_downgrade_scheduled",
    sourceEventId: `downgrade_schedule:${subscription.id}:${targetPlan.id}:${targetInterval ?? "same"}:${subscription.current_period_end ?? "open"}`,
    userId: userId.data,
    planId: targetPlan.id,
    effectiveAt: subscription.current_period_end ?? undefined,
    metadata: {
      fromPlanSlug: currentSlug,
      toPlanSlug: target.data,
      toBillingInterval: targetInterval ?? null,
    },
  })

  return success({
    scheduled: true,
    effectiveAt: subscription.current_period_end,
  })
}

/**
 * Schedule a same-tier or combined period-end billing change (e.g. annual → monthly).
 */
export async function schedulePersonalBillingChange(input: {
  userId: string
  targetPlanSlug: "plan-1" | "plan-2" | "plan-3"
  targetBillingInterval: "monthly" | "yearly"
}): Promise<
  ActionResult<{ scheduled: true; effectiveAt: string | null; message: string }>
> {
  const userId = userIdSchema.safeParse(input.userId)
  if (!userId.success) {
    return failure("validation_error", "Invalid user id.")
  }

  const subscriptionResult = await loadPersonalSubscription(userId.data)
  if (!subscriptionResult.success) {
    return subscriptionResult
  }
  const subscription = subscriptionResult.data

  if (subscription.stripe_subscription_id.startsWith("comp_")) {
    return failure(
      "validation_error",
      "Complimentary memberships are managed by administrators."
    )
  }

  if (subscription.scheduled_plan_id || subscription.scheduled_billing_interval) {
    return failure(
      "validation_error",
      "A plan or billing change is already scheduled."
    )
  }

  if (subscription.cancel_at_period_end) {
    return failure(
      "validation_error",
      "A cancellation is already scheduled for your current plan."
    )
  }

  const currentSlug = (subscription.plans?.slug ?? "plan-1") as
    | "plan-1"
    | "plan-2"
    | "plan-3"

  const { data: currentPrice } = await createAdminClient()
    .from("plan_prices")
    .select("billing_interval")
    .eq("stripe_price_id", subscription.stripe_price_id)
    .maybeSingle()

  const currentInterval =
    currentPrice?.billing_interval === "yearly" ||
    currentPrice?.billing_interval === "monthly"
      ? currentPrice.billing_interval
      : null

  if (!currentInterval) {
    return failure("not_found", "Unable to resolve current billing interval.")
  }

  const classification = classifyMembershipBillingChange({
    currentPlanSlug: currentSlug,
    currentInterval,
    targetPlanSlug: input.targetPlanSlug,
    targetInterval: input.targetBillingInterval,
  })

  if (classification !== "period_end") {
    return failure(
      "validation_error",
      "This change applies after payment. Use the immediate billing preview instead."
    )
  }

  const targetPrice = await resolvePlanPrice({
    planSlug: input.targetPlanSlug,
    interval: input.targetBillingInterval,
  })
  if (!targetPrice.success) {
    return targetPrice
  }

  const effectiveAt = subscription.current_period_end
  const cadenceLabel =
    input.targetBillingInterval === "yearly" ? "annual" : "monthly"

  await createAdminClient()
    .from("subscriptions")
    .update({
      scheduled_plan_id: targetPrice.data.planId,
      scheduled_billing_interval: input.targetBillingInterval,
      cancel_at_period_end: false,
    } as never)
    .eq("id", subscription.id)

  await recordMembershipLifecycleEvent({
    eventType: "membership_downgrade_scheduled",
    sourceEventId: `billing_schedule:${subscription.id}:${targetPrice.data.planId}:${input.targetBillingInterval}:${effectiveAt ?? "open"}`,
    userId: userId.data,
    planId: targetPrice.data.planId,
    effectiveAt: effectiveAt ?? undefined,
    metadata: {
      fromPlanSlug: currentSlug,
      fromBillingInterval: currentInterval,
      toPlanSlug: input.targetPlanSlug,
      toBillingInterval: input.targetBillingInterval,
    },
  })

  return success({
    scheduled: true,
    effectiveAt,
    message: effectiveAt
      ? `Your billing will change to ${cadenceLabel} on ${new Date(effectiveAt).toLocaleDateString("en-US", { dateStyle: "medium" })}.`
      : `Your billing will change to ${cadenceLabel} at the end of your current billing period.`,
  })
}

export type BillingChangePreview = {
  classification: "immediate" | "period_end"
  currentPlanSlug: string
  currentPlanName: string
  currentInterval: "monthly" | "yearly"
  targetPlanSlug: string
  targetInterval: "monthly" | "yearly"
  amountDueNowCents: number | null
  currency: string
  nextRenewalAmountCents: number
  nextRenewalDate: string | null
  creditNote: string | null
  appliesImmediatelyAfterPayment: boolean
  message: string
}

/**
 * Preview an immediate billing change via Stripe invoice preview.
 * Does not mutate local capabilities.
 */
export async function previewImmediateBillingChange(input: {
  userId: string
  targetPlanSlug: "plan-1" | "plan-2" | "plan-3"
  targetBillingInterval: "monthly" | "yearly"
}): Promise<ActionResult<BillingChangePreview>> {
  const userId = userIdSchema.safeParse(input.userId)
  if (!userId.success) {
    return failure("validation_error", "Invalid user id.")
  }

  const modeCheck = assertCheckoutUsesMatchedModeKeys({
    secretKey: env.STRIPE_SECRET_KEY,
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  })
  if (!modeCheck.ok) {
    return failure("provider_error", modeCheck.message)
  }

  const subscriptionResult = await loadPersonalSubscription(userId.data)
  if (!subscriptionResult.success) {
    return subscriptionResult
  }
  const subscription = subscriptionResult.data

  if (subscription.stripe_subscription_id.startsWith("comp_")) {
    return failure(
      "validation_error",
      "Complimentary memberships are managed by administrators."
    )
  }

  const currentSlug = (subscription.plans?.slug ?? "plan-1") as
    | "plan-1"
    | "plan-2"
    | "plan-3"
  const currentName = subscription.plans?.name ?? "Membership"

  const { data: currentPrice } = await createAdminClient()
    .from("plan_prices")
    .select("billing_interval")
    .eq("stripe_price_id", subscription.stripe_price_id)
    .maybeSingle()

  const currentInterval =
    currentPrice?.billing_interval === "yearly" ||
    currentPrice?.billing_interval === "monthly"
      ? currentPrice.billing_interval
      : null

  if (!currentInterval) {
    return failure("not_found", "Unable to resolve current billing interval.")
  }

  const classification = classifyMembershipBillingChange({
    currentPlanSlug: currentSlug,
    currentInterval,
    targetPlanSlug: input.targetPlanSlug,
    targetInterval: input.targetBillingInterval,
  })

  const targetPrice = await resolvePlanPrice({
    planSlug: input.targetPlanSlug,
    interval: input.targetBillingInterval,
  })
  if (!targetPrice.success) {
    return targetPrice
  }

  if (classification === "period_end") {
    return success({
      classification,
      currentPlanSlug: currentSlug,
      currentPlanName: currentName,
      currentInterval,
      targetPlanSlug: input.targetPlanSlug,
      targetInterval: input.targetBillingInterval,
      amountDueNowCents: 0,
      currency: targetPrice.data.currency,
      nextRenewalAmountCents: targetPrice.data.amount,
      nextRenewalDate: subscription.current_period_end,
      creditNote: null,
      appliesImmediatelyAfterPayment: false,
      message:
        input.targetBillingInterval === "monthly"
          ? `Your billing will change to monthly on ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("en-US", { dateStyle: "medium" }) : "period end"}. No prorated refund is issued.`
          : "This change is scheduled for the end of your current billing period.",
    })
  }

  try {
    const stripe = getStripeClient()
    const stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    )
    const item = stripeSub.items.data[0]
    if (!item) {
      return failure("provider_error", "Stripe subscription item not found.")
    }

    const customerId =
      typeof stripeSub.customer === "string"
        ? stripeSub.customer
        : stripeSub.customer.id

    const preview = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: subscription.stripe_subscription_id,
      subscription_details: {
        items: [
          {
            id: item.id,
            price: targetPrice.data.stripePriceId,
          },
        ],
        proration_behavior: "create_prorations",
      },
    })

    const amountDue = preview.amount_due ?? 0
    const currency = preview.currency ?? targetPrice.data.currency

    return success({
      classification: "immediate",
      currentPlanSlug: currentSlug,
      currentPlanName: currentName,
      currentInterval,
      targetPlanSlug: input.targetPlanSlug,
      targetInterval: input.targetBillingInterval,
      amountDueNowCents: amountDue,
      currency,
      nextRenewalAmountCents: targetPrice.data.amount,
      nextRenewalDate: subscription.current_period_end,
      creditNote:
        amountDue < targetPrice.data.amount
          ? "Unused time on your current plan is credited toward this change."
          : null,
      appliesImmediatelyAfterPayment: true,
      message:
        "Upgrades and cadence switches apply only after Stripe confirms successful payment. Local capabilities do not change until the webhook succeeds.",
    })
  } catch (caught) {
    logger.error("Unable to preview billing change.", {
      error: safeErrorMessage(caught),
    })
    return failure(
      "provider_error",
      "Unable to preview this billing change. Please try again."
    )
  }
}

/**
 * Apply an immediate billing change with Stripe pending-update semantics.
 * Local cadence/entitlements update only via webhook after payment succeeds.
 */
export async function applyImmediateBillingChange(input: {
  userId: string
  targetPlanSlug: "plan-1" | "plan-2" | "plan-3"
  targetBillingInterval: "monthly" | "yearly"
}): Promise<
  ActionResult<{
    applied: boolean
    paymentRequired: boolean
    message: string
  }>
> {
  const preview = await previewImmediateBillingChange(input)
  if (!preview.success) {
    return preview
  }

  if (preview.data.classification !== "immediate") {
    return failure(
      "validation_error",
      "This change must be scheduled for period end."
    )
  }

  const userId = userIdSchema.safeParse(input.userId)
  if (!userId.success) {
    return failure("validation_error", "Invalid user id.")
  }

  const subscriptionResult = await loadPersonalSubscription(userId.data)
  if (!subscriptionResult.success) {
    return subscriptionResult
  }
  const subscription = subscriptionResult.data

  const targetPrice = await resolvePlanPrice({
    planSlug: input.targetPlanSlug,
    interval: input.targetBillingInterval,
  })
  if (!targetPrice.success) {
    return targetPrice
  }

  try {
    const stripe = getStripeClient()
    const stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    )
    const item = stripeSub.items.data[0]
    if (!item) {
      return failure("provider_error", "Stripe subscription item not found.")
    }

    const updated = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [
          {
            id: item.id,
            price: targetPrice.data.stripePriceId,
          },
        ],
        proration_behavior: "create_prorations",
        payment_behavior: "pending_if_incomplete",
        metadata: {
          ...stripeSub.metadata,
          plan_price_id: targetPrice.data.id,
          billing_interval: targetPrice.data.billingInterval,
          plan_id: targetPrice.data.planId,
        },
      }
    )

    const pendingUpdate = Boolean(
      (updated as Stripe.Subscription & { pending_update?: unknown })
        .pending_update
    )

    if (pendingUpdate || updated.status === "incomplete") {
      return success({
        applied: false,
        paymentRequired: true,
        message:
          "Payment is required to complete this change. Your current plan and cadence stay active until payment succeeds.",
      })
    }

    // Do not mutate local plan/cadence here — webhook confirmation is required.
    return success({
      applied: true,
      paymentRequired: false,
      message:
        "Stripe accepted the change. Your membership updates after webhook confirmation.",
    })
  } catch (caught) {
    logger.error("Unable to apply immediate billing change.", {
      error: safeErrorMessage(caught),
    })
    return failure(
      "provider_error",
      "Unable to apply this billing change. Your current subscription was preserved."
    )
  }
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
