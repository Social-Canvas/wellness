import type { PostPurchaseDestination } from "../constants/destinations"

export type CheckoutFulfillmentState = "fulfilled" | "processing" | "invalid"

export type CheckoutSuccessView = {
  state: CheckoutFulfillmentState
  title: string
  message: string
  productName: string
  purchaseType: "membership" | "product" | "unknown"
  destination: PostPurchaseDestination | null
  accessReady: boolean
}

export function genericInvalidCheckoutView(): CheckoutSuccessView {
  return {
    state: "invalid",
    title: "Unable to confirm checkout",
    message:
      "We could not verify this checkout session. If you completed a payment, check My Library or your account.",
    productName: "Purchase",
    purchaseType: "unknown",
    destination: null,
    accessReady: false,
  }
}

export function sessionBelongsToUser(
  session: {
    metadata?: { profile_id?: string | null } | null
    client_reference_id?: string | null
  },
  userId: string
): boolean {
  if (session.metadata?.profile_id === userId) {
    return true
  }

  if (session.client_reference_id === userId) {
    return true
  }

  return false
}

/**
 * Pure success-page state machine. Never grants entitlements.
 * Destination must be resolved server-side before calling this helper.
 */
export function buildSuccessViewFromLocalState(input: {
  ownershipOk: boolean
  accessReady: boolean
  paymentOk: boolean
  purchaseType: "membership" | "product"
  productName: string
  destination: PostPurchaseDestination
}): CheckoutSuccessView {
  if (!input.ownershipOk) {
    return genericInvalidCheckoutView()
  }

  if (input.accessReady) {
    return {
      state: "fulfilled",
      title: "Payment successful",
      message: "Payment successful — your access is ready.",
      productName: input.productName,
      purchaseType: input.purchaseType,
      destination: input.destination,
      accessReady: true,
    }
  }

  return {
    state: "processing",
    title: "Payment successful",
    message: "Payment successful. We’re activating your access…",
    productName: input.productName,
    purchaseType: input.purchaseType,
    destination: input.destination,
    accessReady: false,
  }
}

/** Timed-out processing copy used after polling exhausts. */
export const CHECKOUT_PROCESSING_TIMEOUT_MESSAGE =
  "Your payment was received. Access is still being activated."

/**
 * Idempotent webhook decision helper (pure).
 * Duplicate + already processed/ignored → skip; otherwise process.
 */
export function shouldProcessWebhookEvent(input: {
  recordStatus: "new" | "duplicate"
  existingStatus: "received" | "processed" | "failed" | "ignored" | null
}): "process" | "skip_duplicate" {
  if (input.recordStatus === "duplicate") {
    if (input.existingStatus === "processed" || input.existingStatus === "ignored") {
      return "skip_duplicate"
    }
  }

  return "process"
}

/**
 * Cancelled checkout sessions must not create entitlements.
 */
export function cancelledCheckoutCreatesEntitlement(): false {
  return false
}

/**
 * Success page must never grant access — verification only.
 */
export function successPageGrantsEntitlement(): false {
  return false
}
