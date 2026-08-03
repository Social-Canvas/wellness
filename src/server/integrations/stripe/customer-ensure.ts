/**
 * Pure Stripe customer ensure helpers (no path aliases / server-only).
 * Safe for Node unit tests — same pattern as lifecycle-email.pure.ts.
 */

export type EnsureStripeCustomerProfile = {
  id: string
  email: string
  stripe_customer_id: string | null
}

export type EnsureStripeCustomerResult =
  | { success: true; data: string }
  | { success: false; error: { code: string; message: string } }

export type EnsureStripeCustomerDeps = {
  retrieveCustomer: (customerId: string) => Promise<{ id: string }>
  createCustomer: (params: {
    email: string
    metadata: { profile_id: string }
  }) => Promise<{ id: string }>
  clearCustomerId: (profileId: string) => Promise<{ error: { message: string } | null }>
  saveCustomerId: (
    profileId: string,
    customerId: string
  ) => Promise<{ error: { message: string } | null }>
  onStaleCustomer?: (params: { customerIdSuffix: string }) => void
}

/**
 * Last 4 characters of a Stripe customer id for safe logs (never log the full id).
 */
export function stripeCustomerIdSuffix(customerId: string): string {
  if (customerId.length <= 4) {
    return customerId
  }

  return customerId.slice(-4)
}

/**
 * True when Stripe reports the customer id does not exist in the current mode
 * (typical after switching test → live keys while a test customer id remains on the profile).
 */
export function isMissingStripeCustomerError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }

  const record = error as {
    code?: unknown
    message?: unknown
    type?: unknown
  }

  const message = typeof record.message === "string" ? record.message : ""
  const mentionsCustomer = /no such customer/i.test(message)

  if (!mentionsCustomer) {
    return false
  }

  if (record.code === "resource_missing") {
    return true
  }

  // StripeInvalidRequestError / invalid_request_error without a code still count
  // when the message explicitly says the customer is missing.
  const type = typeof record.type === "string" ? record.type : ""
  if (
    type === "StripeInvalidRequestError" ||
    type === "invalid_request_error" ||
    type === ""
  ) {
    return true
  }

  return false
}

async function createAndPersistCustomer(
  profile: EnsureStripeCustomerProfile,
  deps: EnsureStripeCustomerDeps
): Promise<EnsureStripeCustomerResult> {
  try {
    const customer = await deps.createCustomer({
      email: profile.email,
      metadata: {
        profile_id: profile.id,
      },
    })

    const { error } = await deps.saveCustomerId(profile.id, customer.id)

    if (error) {
      return {
        success: false,
        error: {
          code: "provider_error",
          message: "Unable to create Stripe customer. Please try again.",
        },
      }
    }

    return { success: true, data: customer.id }
  } catch {
    return {
      success: false,
      error: {
        code: "provider_error",
        message: "Unable to create Stripe customer. Please try again.",
      },
    }
  }
}

/**
 * Returns a Stripe customer id valid in the current API mode.
 * If the profile stores a stale id (e.g. test customer under live keys), clears it
 * and creates a new customer before returning.
 */
export async function ensureStripeCustomerId(
  profile: EnsureStripeCustomerProfile,
  deps: EnsureStripeCustomerDeps
): Promise<EnsureStripeCustomerResult> {
  const existingId = profile.stripe_customer_id

  if (existingId) {
    try {
      const customer = await deps.retrieveCustomer(existingId)
      return { success: true, data: customer.id }
    } catch (caught) {
      if (!isMissingStripeCustomerError(caught)) {
        return {
          success: false,
          error: {
            code: "provider_error",
            message: "Unable to create Stripe customer. Please try again.",
          },
        }
      }

      deps.onStaleCustomer?.({
        customerIdSuffix: stripeCustomerIdSuffix(existingId),
      })

      const { error: clearError } = await deps.clearCustomerId(profile.id)

      if (clearError) {
        return {
          success: false,
          error: {
            code: "provider_error",
            message: "Unable to create Stripe customer. Please try again.",
          },
        }
      }
    }
  }

  return createAndPersistCustomer(profile, deps)
}
