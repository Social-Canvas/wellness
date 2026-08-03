/**
 * Stripe mode helpers — keep test and live resources strictly separated.
 */

export function isStripeTestSecretKey(secretKey: string): boolean {
  // sk_test_ / rk_test_ standard keys; rkcs_test_ = Stripe CLI sandbox restricted keys
  return (
    secretKey.startsWith("sk_test_") ||
    secretKey.startsWith("rk_test_") ||
    secretKey.startsWith("rkcs_test_")
  )
}

export function isStripeLiveSecretKey(secretKey: string): boolean {
  return secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")
}

export function isStripeTestPublishableKey(publishableKey: string): boolean {
  return publishableKey.startsWith("pk_test_")
}

export function isStripeLivePublishableKey(publishableKey: string): boolean {
  return publishableKey.startsWith("pk_live_")
}

export function isValidStripeWebhookSecret(secret: string): boolean {
  return secret.startsWith("whsec_")
}

export type StripeModeMismatchReason =
  | "live_event_in_test_mode"
  | "test_event_in_live_mode"
  | "invalid_secret_key"

/**
 * When the app is configured with test keys, reject live webhook events (and vice versa).
 * Returns a reason if the event must be rejected; otherwise null.
 */
export function getStripeLivemodeMismatch(
  livemode: boolean,
  secretKey: string
): StripeModeMismatchReason | null {
  if (isStripeTestSecretKey(secretKey)) {
    return livemode ? "live_event_in_test_mode" : null
  }

  if (isStripeLiveSecretKey(secretKey)) {
    return livemode ? null : "test_event_in_live_mode"
  }

  return "invalid_secret_key"
}

/**
 * Reject placeholder / non-Stripe price IDs before creating Checkout Sessions.
 * Real Stripe Price IDs are `price_…` (not `price_placeholder_…`).
 */
export function isConfiguredStripePriceId(priceId: string): boolean {
  if (!priceId.startsWith("price_")) {
    return false
  }

  if (priceId.startsWith("price_placeholder_")) {
    return false
  }

  return priceId.length > "price_".length
}

/**
 * Checkout / Stripe-mutating flows require a matched key pair:
 * - test secret + test publishable (sandbox / Preview)
 * - live secret + live publishable (Production after live activation)
 * Mixed or unrecognized keys are rejected so test and live resources stay separated.
 */
export function assertCheckoutUsesMatchedModeKeys(params: {
  secretKey: string
  publishableKey: string
}): { ok: true } | { ok: false; message: string } {
  const secretIsTest = isStripeTestSecretKey(params.secretKey)
  const secretIsLive = isStripeLiveSecretKey(params.secretKey)
  const publishableIsTest = isStripeTestPublishableKey(params.publishableKey)
  const publishableIsLive = isStripeLivePublishableKey(params.publishableKey)

  if (secretIsTest && publishableIsTest) {
    return { ok: true }
  }

  if (secretIsLive && publishableIsLive) {
    return { ok: true }
  }

  if (!secretIsTest && !secretIsLive) {
    return {
      ok: false,
      message:
        "Stripe secret key must be a test-mode (sk_test_ / rk_test_ / rkcs_test_) or live-mode (sk_live_ / rk_live_) key.",
    }
  }

  if (!publishableIsTest && !publishableIsLive) {
    return {
      ok: false,
      message:
        "Stripe publishable key must be a test-mode (pk_test_) or live-mode (pk_live_) key.",
    }
  }

  return {
    ok: false,
    message:
      "Stripe secret and publishable keys must both be test-mode or both be live-mode.",
  }
}
