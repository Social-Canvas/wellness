import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  buildSuccessViewFromLocalState,
  genericInvalidCheckoutView,
  sessionBelongsToUser,
  type CheckoutFulfillmentState,
  type CheckoutSuccessView,
} from "@/features/checkout/utils/checkout-success-state"
import { resolvePostPurchaseDestination } from "@/features/checkout/constants/destinations"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/server/integrations/stripe/client"
import { getStripeLivemodeMismatch } from "@/server/integrations/stripe/mode"
import { env } from "@/lib/config"

const sessionIdSchema = z
  .string()
  .trim()
  .min(1, "Checkout session id is required.")
  .max(200, "Checkout session id is too long.")
  .regex(/^cs_/, "Invalid checkout session id.")

export type { CheckoutFulfillmentState, CheckoutSuccessView }

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

async function hasPaidOrderForSession(
  userId: string,
  checkoutSessionId: string
): Promise<boolean> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .eq("status", "paid")
    .maybeSingle()

  if (error) {
    return false
  }

  return Boolean(data)
}

async function hasActiveSubscriptionForUser(userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)

  if (error) {
    return false
  }

  return (data?.length ?? 0) > 0
}

async function loadProductMeta(productId: string | null | undefined): Promise<{
  slug: string | null
  productType: string | null
  grantedCourseId: string | null
  title: string | null
}> {
  if (!productId) {
    return { slug: null, productType: null, grantedCourseId: null, title: null }
  }

  const parsed = z.uuid().safeParse(productId)

  if (!parsed.success) {
    return { slug: null, productType: null, grantedCourseId: null, title: null }
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("products")
    .select("slug, product_type, granted_course_id, title")
    .eq("id", parsed.data)
    .maybeSingle()

  return {
    slug: data?.slug ?? null,
    productType: data?.product_type ?? null,
    grantedCourseId: data?.granted_course_id ?? null,
    title: data?.title ?? null,
  }
}

async function loadPlanName(planPriceId: string | null | undefined): Promise<string | null> {
  if (!planPriceId) {
    return null
  }

  const parsed = z.uuid().safeParse(planPriceId)

  if (!parsed.success) {
    return null
  }

  const supabase = createAdminClient()
  const { data: planPrice } = await supabase
    .from("plan_prices")
    .select("plan_id")
    .eq("id", parsed.data)
    .maybeSingle()

  if (!planPrice?.plan_id) {
    return null
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("name")
    .eq("id", planPrice.plan_id)
    .maybeSingle()

  return plan?.name ?? null
}

/**
 * Resolve success-page state from Stripe + local fulfillment.
 * Never grants entitlements — read-only verification only.
 */
export async function resolveCheckoutSuccessView(
  userId: string,
  sessionId: string | null | undefined
): Promise<ActionResult<CheckoutSuccessView>> {
  const parsedUserId = z.uuid().safeParse(userId)

  if (!parsedUserId.success) {
    return success(genericInvalidCheckoutView())
  }

  const parsedSessionId = sessionIdSchema.safeParse(sessionId)

  if (!parsedSessionId.success) {
    return success(genericInvalidCheckoutView())
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.retrieve(parsedSessionId.data)

    const mismatch = getStripeLivemodeMismatch(session.livemode, env.STRIPE_SECRET_KEY)

    if (mismatch) {
      return success(genericInvalidCheckoutView())
    }

    if (!sessionBelongsToUser(session, parsedUserId.data)) {
      return success(genericInvalidCheckoutView())
    }

    const purchaseType: "membership" | "product" =
      session.mode === "subscription" ? "membership" : "product"

    const productMeta = await loadProductMeta(session.metadata?.product_id)
    const planName = await loadPlanName(session.metadata?.plan_price_id)

    const productName =
      productMeta.title ??
      planName ??
      (purchaseType === "membership" ? "Membership" : "Your purchase")

    const paymentOk =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required"

    let accessReady = false

    if (purchaseType === "product") {
      accessReady = await hasPaidOrderForSession(parsedUserId.data, session.id)
    } else {
      accessReady = await hasActiveSubscriptionForUser(parsedUserId.data)
    }

    return success(
      buildSuccessViewFromLocalState({
        ownershipOk: true,
        accessReady,
        paymentOk: paymentOk || session.status === "complete",
        purchaseType,
        productName,
        destination: resolvePostPurchaseDestination({
          purchaseType,
          productSlug: productMeta.slug,
          productType: productMeta.productType,
          grantedCourseId: productMeta.grantedCourseId,
        }),
      })
    )
  } catch {
    return success(genericInvalidCheckoutView())
  }
}

/** Narrow status check used by client polling — does not grant access. */
export async function getCheckoutFulfillmentStatus(
  userId: string,
  sessionId: string
): Promise<
  ActionResult<{
    state: CheckoutFulfillmentState
    accessReady: boolean
    destinationHref: string | null
  }>
> {
  const viewResult = await resolveCheckoutSuccessView(userId, sessionId)

  if (!viewResult.success) {
    return viewResult
  }

  return success({
    state: viewResult.data.state,
    accessReady: viewResult.data.accessReady,
    destinationHref: viewResult.data.destination?.href ?? null,
  })
}
