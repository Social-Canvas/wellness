import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  buildCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
} from "@/features/checkout/utils/stripe-return-urls"
import type { CreateLiveTrialCheckoutInput } from "@/features/live-sessions/schemas"
import { confirmLiveTrialRegistrationFromWebhook } from "@/features/live-sessions/services/live-sessions.service"
import { buildLiveTrialCheckoutMetadata } from "@/features/live-sessions/utils/live-sessions"
import {
  LIVE_BREATHWORK_TRIAL_PRODUCT_SLUG,
  canStartLiveBreathworkTrialCheckout,
} from "@/lib/constants/live-breathwork-trial"
import { env } from "@/lib/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/server/integrations/stripe/client"
import { ensureStripeCustomerForProfile } from "@/server/integrations/stripe/customer"
import {
  assertCheckoutUsesMatchedModeKeys,
  isConfiguredStripePriceId,
  isStripeLiveSecretKey,
  summarizeStripeProviderError,
} from "@/server/integrations/stripe/mode"
import { logger } from "@/server/utils/logger"

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

async function getProfileForCheckout(userId: string): Promise<
  ActionResult<{
    id: string
    email: string
    full_name: string | null
    stripe_customer_id: string | null
  }>
> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle()

  if (error || !data) {
    return failure("not_found", "Profile not found.")
  }

  return success(
    data as {
      id: string
      email: string
      full_name: string | null
      stripe_customer_id: string | null
    }
  )
}

export async function createLiveBreathworkTrialCheckoutSession(
  userId: string,
  input: CreateLiveTrialCheckoutInput
): Promise<
  ActionResult<{ sessionId: string | null; url: string; alreadyEntitled: boolean }>
> {
  try {
    const modeCheck = assertCheckoutUsesMatchedModeKeys({
      secretKey: env.STRIPE_SECRET_KEY,
      publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    })
    if (!modeCheck.ok) {
      return failure("provider_error", modeCheck.message)
    }

    const supabase = createAdminClient()

    const [{ data: product }, { data: liveClass }, { data: existing }] =
      await Promise.all([
        supabase
          .from("products")
          .select("id, slug, title, stripe_price_id, status, price_amount")
          .eq("slug", LIVE_BREATHWORK_TRIAL_PRODUCT_SLUG)
          .maybeSingle(),
        supabase
          .from("live_classes")
          .select(
            "id, title, status, allows_public_trial, trial_open, completed_at, starts_at"
          )
          .eq("id", input.liveClassId)
          .maybeSingle(),
        supabase
          .from("live_session_registrations")
          .select("id, status")
          .eq("user_id", userId)
          .eq("live_class_id", input.liveClassId)
          .eq("registration_type", "public_trial")
          .maybeSingle(),
      ])

    if (!product || product.status !== "published") {
      return failure("not_found", "Live Breathwork trial is not available.")
    }

    if (!liveClass) {
      return failure("not_found", "Selected live session was not found.")
    }

    const session = liveClass as {
      id: string
      status: string
      allows_public_trial: boolean
      trial_open: boolean
      completed_at: string | null
      starts_at: string | null
    }

    if (
      session.status !== "published" ||
      !session.allows_public_trial ||
      !session.trial_open ||
      session.completed_at
    ) {
      return failure(
        "validation_error",
        "This live session is not open for public trial registration."
      )
    }

    if (session.starts_at && new Date(session.starts_at) < new Date()) {
      return failure(
        "validation_error",
        "Trial registration is only available for upcoming sessions."
      )
    }

    const existingReg = existing as { id: string; status: string } | null
    if (
      existingReg &&
      (existingReg.status === "confirmed" || existingReg.status === "attended")
    ) {
      return success({
        sessionId: null,
        url: `/dashboard/live-sessions/${session.id}/join?trial=1`,
        alreadyEntitled: true,
      })
    }

    const stripeMode = isStripeLiveSecretKey(env.STRIPE_SECRET_KEY)
      ? "live"
      : "test"
    const priceId = (product as { stripe_price_id: string | null }).stripe_price_id
    const gate = canStartLiveBreathworkTrialCheckout({
      stripeMode: stripeMode === "live" ? "live" : "test",
      hasConfiguredStripePriceId: isConfiguredStripePriceId(priceId ?? ""),
    })

    if (!gate.ok) {
      return failure("provider_error", gate.reason)
    }

    const profileResult = await getProfileForCheckout(userId)
    if (!profileResult.success) {
      return profileResult
    }

    const customerResult = await ensureStripeCustomerForProfile(
      profileResult.data
    )
    if (!customerResult.success) {
      return customerResult
    }

    const metadata = buildLiveTrialCheckoutMetadata({
      profileId: userId,
      productId: (product as { id: string }).id,
      liveClassId: session.id,
    })

    const stripe = getStripeClient()
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerResult.data,
      client_reference_id: userId,
      line_items: [{ price: priceId!, quantity: 1 }],
      success_url: buildCheckoutSuccessUrl(),
      cancel_url: buildCheckoutCancelUrl({ type: "product" }),
      metadata,
    })

    if (!checkout.url) {
      return failure("provider_error", "Unable to create checkout session.")
    }

    await supabase.from("live_session_registrations").upsert(
      {
        live_class_id: session.id,
        user_id: userId,
        registration_type: "public_trial",
        status: "pending_payment",
        product_id: (product as { id: string }).id,
        stripe_checkout_session_id: checkout.id,
      },
      { onConflict: "live_class_id,user_id,registration_type" }
    )

    return success({
      sessionId: checkout.id,
      url: checkout.url,
      alreadyEntitled: false,
    })
  } catch (caught) {
    const stripeError = summarizeStripeProviderError(caught)
    logger.error("Unable to create live breathwork trial checkout.", {
      stripeType: stripeError.stripeType,
      stripeCode: stripeError.stripeCode,
      error: stripeError.message,
    })
    return failure(
      "provider_error",
      "Unable to create checkout session. Please try again."
    )
  }
}

export async function fulfillLiveTrialFromPaidOrder(input: {
  userId: string
  productId: string
  liveClassId: string
  orderId: string
  stripeCheckoutSessionId: string
}): Promise<ActionResult<{ registrationId: string }>> {
  return confirmLiveTrialRegistrationFromWebhook(input)
}
