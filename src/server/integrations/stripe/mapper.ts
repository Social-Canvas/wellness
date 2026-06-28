import type Stripe from "stripe"

import type { Database } from "@/types/database/supabase"

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"]
type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"]
type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"]

const STRIPE_SUBSCRIPTION_STATUS_MAP: Record<
  Stripe.Subscription.Status,
  SubscriptionStatus
> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  unpaid: "unpaid",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "incomplete_expired",
  paused: "paused",
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  return STRIPE_SUBSCRIPTION_STATUS_MAP[status]
}

function toIsoTimestamp(unix: number | null | undefined): string | null {
  if (unix === null || unix === undefined) {
    return null
  }

  return new Date(unix * 1000).toISOString()
}

export function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) {
    return null
  }

  return typeof customer === "string" ? customer : customer.id
}

export function getStripeSubscriptionPriceId(
  subscription: Stripe.Subscription
): string | null {
  return subscription.items.data[0]?.price?.id ?? null
}

function getSubscriptionBillingPeriod(subscription: Stripe.Subscription): {
  currentPeriodStart: number | null
  currentPeriodEnd: number | null
} {
  const item = subscription.items.data[0]

  return {
    currentPeriodStart: item?.current_period_start ?? null,
    currentPeriodEnd: item?.current_period_end ?? null,
  }
}

export function mapStripeSubscriptionToUpsert(input: {
  subscription: Stripe.Subscription
  userId: string
  planId: string
}): SubscriptionInsert {
  const { subscription, userId, planId } = input
  const stripeCustomerId = getStripeCustomerId(subscription.customer)
  const stripePriceId = getStripeSubscriptionPriceId(subscription)

  if (!stripeCustomerId || !stripePriceId) {
    throw new Error("Stripe subscription is missing customer or price data.")
  }

  const billingPeriod = getSubscriptionBillingPeriod(subscription)

  return {
    user_id: userId,
    plan_id: planId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: stripePriceId,
    status: mapStripeSubscriptionStatus(subscription.status),
    current_period_start: toIsoTimestamp(billingPeriod.currentPeriodStart),
    current_period_end: toIsoTimestamp(billingPeriod.currentPeriodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: toIsoTimestamp(subscription.canceled_at),
    ended_at: toIsoTimestamp(subscription.ended_at),
  }
}

export function mapStripeSubscriptionToUpdate(
  subscription: Stripe.Subscription,
  planId: string
): SubscriptionUpdate {
  const stripePriceId = getStripeSubscriptionPriceId(subscription)

  if (!stripePriceId) {
    throw new Error("Stripe subscription is missing price data.")
  }

  const billingPeriod = getSubscriptionBillingPeriod(subscription)

  return {
    plan_id: planId,
    stripe_price_id: stripePriceId,
    status: mapStripeSubscriptionStatus(subscription.status),
    current_period_start: toIsoTimestamp(billingPeriod.currentPeriodStart),
    current_period_end: toIsoTimestamp(billingPeriod.currentPeriodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: toIsoTimestamp(subscription.canceled_at),
    ended_at: toIsoTimestamp(subscription.ended_at),
  }
}
