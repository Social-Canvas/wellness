import "server-only"

import type Stripe from "stripe"

import { syncSubscriptionFromStripe } from "@/features/billing/services/billing.service"
import { syncOrderFromStripeCheckoutSession } from "@/features/shop/services/shop.service"
import { env } from "@/lib/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/server/integrations/stripe/client"
import type { Database } from "@/types/database/supabase"

type WebhookEventStatus = Database["public"]["Enums"]["webhook_event_status"]

export type StripeWebhookResult =
  | { status: "processed" }
  | { status: "duplicate" }
  | { status: "ignored" }
  | { status: "failed"; message: string }

const SUBSCRIPTION_SYNC_EVENTS = new Set<string>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
])

export function verifyStripeWebhookEvent(
  payload: string,
  signature: string | null
): Stripe.Event {
  if (!signature) {
    throw new Error("Missing Stripe signature.")
  }

  const stripe = getStripeClient()

  return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET)
}

async function recordWebhookEvent(event: Stripe.Event): Promise<"new" | "duplicate"> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("webhook_events").insert({
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Database["public"]["Tables"]["webhook_events"]["Insert"]["payload"],
    status: "received",
  })

  if (error?.code === "23505") {
    return "duplicate"
  }

  if (error) {
    throw new Error(error.message)
  }

  return "new"
}

async function updateWebhookEventStatus(
  providerEventId: string,
  status: WebhookEventStatus,
  errorMessage?: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("webhook_events")
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: status === "processed" ? new Date().toISOString() : null,
    })
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId)

  if (error) {
    throw new Error(error.message)
  }
}

async function getExistingWebhookStatus(
  providerEventId: string
): Promise<WebhookEventStatus | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("webhook_events")
    .select("status")
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.status ?? null
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription

  if (!subscription) {
    return null
  }

  return typeof subscription === "string" ? subscription : subscription.id
}

async function resolveSubscriptionIdFromEvent(
  event: Stripe.Event
): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.mode !== "subscription") {
        return null
      }

      const subscription = session.subscription

      if (!subscription) {
        return null
      }

      return typeof subscription === "string" ? subscription : subscription.id
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      return subscription.id
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      return getSubscriptionIdFromInvoice(invoice)
    }
    default:
      return null
  }
}

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.mode === "payment") {
      const syncResult = await syncOrderFromStripeCheckoutSession(session.id)

      if (!syncResult.success) {
        throw new Error(syncResult.error.message)
      }

      return
    }
  }

  if (!SUBSCRIPTION_SYNC_EVENTS.has(event.type)) {
    return
  }

  const subscriptionId = await resolveSubscriptionIdFromEvent(event)

  if (!subscriptionId) {
    return
  }

  const syncResult = await syncSubscriptionFromStripe(subscriptionId)

  if (!syncResult.success) {
    throw new Error(syncResult.error.message)
  }
}

export async function handleStripeWebhook(
  payload: string,
  signature: string | null
): Promise<StripeWebhookResult> {
  let event: Stripe.Event

  try {
    event = verifyStripeWebhookEvent(payload, signature)
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "Invalid Stripe webhook signature.",
    }
  }

  const recordStatus = await recordWebhookEvent(event)

  if (recordStatus === "duplicate") {
    const existingStatus = await getExistingWebhookStatus(event.id)

    if (existingStatus === "processed" || existingStatus === "ignored") {
      return { status: "duplicate" }
    }
  }

  try {
    await processStripeEvent(event)
    await updateWebhookEventStatus(event.id, "processed")
    return { status: "processed" }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process Stripe webhook."

    await updateWebhookEventStatus(event.id, "failed", message)
    return { status: "failed", message }
  }
}
