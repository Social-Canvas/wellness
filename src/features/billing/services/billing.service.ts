import "server-only"

import type Stripe from "stripe"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type {
  BillingPortalSessionResult,
  CheckoutSessionResult,
  CurrentSubscription,
  Subscription,
} from "@/features/billing/types"
import { env } from "@/lib/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/server/integrations/stripe/client"
import {
  getStripeCustomerId,
  mapStripeSubscriptionToUpdate,
  mapStripeSubscriptionToUpsert,
} from "@/server/integrations/stripe/mapper"
import type { Database } from "@/types/database/supabase"

const userIdSchema = z.uuid("Invalid user id.")
const planPriceIdSchema = z.uuid("Invalid plan price id.")
const stripeSubscriptionIdSchema = z.string().min(1, "Invalid Stripe subscription id.")

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "stripe_customer_id"
>

type PlanPriceRow = Database["public"]["Tables"]["plan_prices"]["Row"]

type SubscriptionWithPlan = Subscription & {
  plans: Pick<
    Database["public"]["Tables"]["plans"]["Row"],
    "id" | "name" | "slug"
  > | null
}

function mapCurrentSubscription(
  row: SubscriptionWithPlan,
  billingInterval: Database["public"]["Enums"]["billing_interval"] | null
): CurrentSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    planName: row.plans?.name ?? "Membership",
    planSlug: row.plans?.slug ?? "",
    status: row.status,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    billingInterval,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    canceledAt: row.canceled_at,
    endedAt: row.ended_at,
  }
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function validationFailure(message: string): ActionResult<never> {
  return failure("validation_error", message)
}

function firstValidationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "23505") {
    return failure("provider_error", "Subscription record conflict. Please try again.")
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Billing record not found.")
  }

  return failure("provider_error", "Unable to complete the billing request. Please try again.")
}

async function getProfileByUserId(userId: string): Promise<ActionResult<ProfileRow>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Profile not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function getActivePlanPrice(
  planPriceId: string
): Promise<ActionResult<PlanPriceRow>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("plan_prices")
      .select("*")
      .eq("id", planPriceId)
      .eq("is_active", true)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Plan price not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function getPlanPriceByStripePriceId(
  stripePriceId: string
): Promise<ActionResult<PlanPriceRow>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("plan_prices")
      .select("*")
      .eq("stripe_price_id", stripePriceId)
      .eq("is_active", true)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure(
        "not_found",
        "No local plan price is configured for this Stripe price."
      )
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function ensureStripeCustomer(
  profile: ProfileRow
): Promise<ActionResult<string>> {
  if (profile.stripe_customer_id) {
    return success(profile.stripe_customer_id)
  }

  try {
    const stripe = getStripeClient()
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: {
        profile_id: profile.id,
      },
    })

    const supabase = createAdminClient()
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", profile.id)

    if (error) {
      return mapDatabaseError(error)
    }

    return success(customer.id)
  } catch {
    return failure("provider_error", "Unable to create Stripe customer. Please try again.")
  }
}

async function resolveUserIdForSubscription(
  subscription: Stripe.Subscription
): Promise<ActionResult<string>> {
  const metadataProfileId = subscription.metadata.profile_id

  if (metadataProfileId) {
    const parsedProfileId = userIdSchema.safeParse(metadataProfileId)

    if (parsedProfileId.success) {
      return success(parsedProfileId.data)
    }
  }

  const stripeCustomerId = getStripeCustomerId(subscription.customer)

  if (!stripeCustomerId) {
    return failure("not_found", "Stripe subscription customer not found.")
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Profile not found for Stripe customer.")
    }

    return success(data.id)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function createCheckoutSession(
  userId: string,
  planPriceId: string
): Promise<ActionResult<CheckoutSessionResult>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedPlanPriceId = planPriceIdSchema.safeParse(planPriceId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedPlanPriceId.success) {
    return validationFailure(firstValidationMessage(parsedPlanPriceId.error))
  }

  const profileResult = await getProfileByUserId(parsedUserId.data)

  if (!profileResult.success) {
    return profileResult
  }

  const planPriceResult = await getActivePlanPrice(parsedPlanPriceId.data)

  if (!planPriceResult.success) {
    return planPriceResult
  }

  const customerResult = await ensureStripeCustomer(profileResult.data)

  if (!customerResult.success) {
    return customerResult
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerResult.data,
      client_reference_id: parsedUserId.data,
      line_items: [
        {
          price: planPriceResult.data.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=canceled`,
      metadata: {
        profile_id: parsedUserId.data,
        plan_price_id: parsedPlanPriceId.data,
      },
      subscription_data: {
        metadata: {
          profile_id: parsedUserId.data,
          plan_price_id: parsedPlanPriceId.data,
        },
      },
    })

    if (!session.url) {
      return failure("provider_error", "Unable to create checkout session.")
    }

    return success({
      sessionId: session.id,
      url: session.url,
    })
  } catch {
    return failure("provider_error", "Unable to create checkout session. Please try again.")
  }
}

export async function createBillingPortalSession(
  userId: string
): Promise<ActionResult<BillingPortalSessionResult>> {
  const parsedUserId = userIdSchema.safeParse(userId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  const profileResult = await getProfileByUserId(parsedUserId.data)

  if (!profileResult.success) {
    return profileResult
  }

  if (!profileResult.data.stripe_customer_id) {
    return failure(
      "payment_required",
      "A Stripe customer is required before opening the billing portal."
    )
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: profileResult.data.stripe_customer_id,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })

    return success({ url: session.url })
  } catch {
    return failure(
      "provider_error",
      "Unable to create billing portal session. Please try again."
    )
  }
}

export async function syncSubscriptionFromStripe(
  stripeSubscriptionId: string
): Promise<ActionResult<Subscription>> {
  const parsedSubscriptionId = stripeSubscriptionIdSchema.safeParse(stripeSubscriptionId)

  if (!parsedSubscriptionId.success) {
    return validationFailure(firstValidationMessage(parsedSubscriptionId.error))
  }

  try {
    const stripe = getStripeClient()
    const subscription = await stripe.subscriptions.retrieve(parsedSubscriptionId.data, {
      expand: ["items.data.price"],
    })

    const userIdResult = await resolveUserIdForSubscription(subscription)

    if (!userIdResult.success) {
      return userIdResult
    }

    const stripePriceId = subscription.items.data[0]?.price?.id

    if (!stripePriceId) {
      return failure("provider_error", "Stripe subscription is missing a price.")
    }

    const planPriceResult = await getPlanPriceByStripePriceId(stripePriceId)

    if (!planPriceResult.success) {
      return planPriceResult
    }

    const supabase = createAdminClient()
    const upsertPayload = mapStripeSubscriptionToUpsert({
      subscription,
      userId: userIdResult.data,
      planId: planPriceResult.data.plan_id,
    })

    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle()

    if (existingError) {
      return mapDatabaseError(existingError)
    }

    if (existing) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update(
          mapStripeSubscriptionToUpdate(subscription, planPriceResult.data.plan_id)
        )
        .eq("id", existing.id)
        .select("*")
        .single()

      if (error || !data) {
        return error
          ? mapDatabaseError(error)
          : failure("provider_error", "Unable to update subscription.")
      }

      return success(data)
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert(upsertPayload)
      .select("*")
      .single()

    if (error || !data) {
      return error
        ? mapDatabaseError(error)
        : failure("provider_error", "Unable to create subscription.")
    }

    return success(data)
  } catch {
    return failure("provider_error", "Unable to sync subscription from Stripe.")
  }
}

export async function getCurrentSubscription(
  userId: string
): Promise<ActionResult<CurrentSubscription | null>> {
  const parsedUserId = userIdSchema.safeParse(userId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `
        *,
        plans ( id, name, slug )
      `
      )
      .eq("user_id", parsedUserId.data)
      .order("created_at", { ascending: false })

    if (error) {
      return mapDatabaseError(error)
    }

    const rows = (data ?? []) as SubscriptionWithPlan[]

    if (rows.length === 0) {
      return success(null)
    }

    const activeStatuses = new Set<Subscription["status"]>(["active", "trialing", "past_due"])
    const preferred =
      rows.find((row) => activeStatuses.has(row.status)) ?? rows[0]

    const { data: planPrice } = await supabase
      .from("plan_prices")
      .select("billing_interval")
      .eq("stripe_price_id", preferred.stripe_price_id)
      .maybeSingle()

    return success(
      mapCurrentSubscription(preferred, planPrice?.billing_interval ?? null)
    )
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
