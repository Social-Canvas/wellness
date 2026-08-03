/**
 * Live Breathwork one-time trial product configuration.
 *
 * $55 (5500 cents) exists as a seed/catalog amount only.
 * Do NOT treat it as live-Stripe-approved until explicitly confirmed
 * in this app config AND sandbox E2E passes.
 */

export const LIVE_BREATHWORK_TRIAL_PRODUCT_SLUG =
  "standalone-live-session" as const

/** Catalog / seed amount in cents. Not authorization to create a live Price. */
export const LIVE_BREATHWORK_TRIAL_CATALOG_AMOUNT_CENTS = 5500 as const

/**
 * Client confirmation gate for the $55 trial price.
 * Remains false until business explicitly approves this amount in active app config.
 */
export const LIVE_BREATHWORK_TRIAL_PRICE_APPROVED_IN_APP_CONFIG = false as const

export const LIVE_BREATHWORK_TRIAL_CONFIRMATION_NEEDED =
  "Live Breathwork trial catalog amount is $55, but price approval in active app config is still required before sandbox Price creation or live Stripe objects." as const

export function isLiveBreathworkTrialPriceApproved(): boolean {
  return Boolean(LIVE_BREATHWORK_TRIAL_PRICE_APPROVED_IN_APP_CONFIG)
}

/**
 * Whether checkout may create a Stripe Checkout Session for the trial product
 * in the current environment. Live Price objects must still stay deferred
 * until sandbox E2E passes (see live-activation-inventory).
 */
export function canStartLiveBreathworkTrialCheckout(options: {
  stripeMode: "test" | "live"
  hasConfiguredStripePriceId: boolean
}): { ok: true } | { ok: false; reason: string } {
  if (!isLiveBreathworkTrialPriceApproved()) {
    return { ok: false, reason: LIVE_BREATHWORK_TRIAL_CONFIRMATION_NEEDED }
  }

  if (options.stripeMode === "live") {
    return {
      ok: false,
      reason:
        "Live Breathwork trial must not create or use live Stripe Prices until sandbox E2E verification passes.",
    }
  }

  if (!options.hasConfiguredStripePriceId) {
    return {
      ok: false,
      reason:
        "Sandbox Stripe Price ID is not configured for the Live Breathwork trial product yet.",
    }
  }

  return { ok: true }
}
