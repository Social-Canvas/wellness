import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeClient } from "@/server/integrations/stripe/client"
import {
  ensureStripeCustomerId,
  type EnsureStripeCustomerProfile,
} from "@/server/integrations/stripe/customer-ensure"
import { logger } from "@/server/utils/logger"

export {
  isMissingStripeCustomerError,
  stripeCustomerIdSuffix,
} from "@/server/integrations/stripe/customer-ensure"

/**
 * Shared Stripe customer resolve/create used by membership and product checkout.
 * Recreates the customer when a stored id is missing in the current Stripe mode.
 */
export async function ensureStripeCustomerForProfile(
  profile: EnsureStripeCustomerProfile
): Promise<ActionResult<string>> {
  const stripe = getStripeClient()
  const supabase = createAdminClient()

  const result = await ensureStripeCustomerId(profile, {
    retrieveCustomer: async (customerId) => {
      const customer = await stripe.customers.retrieve(customerId)

      if (customer.deleted) {
        const missing = new Error(`No such customer: '${customerId}'`)
        ;(missing as Error & { code: string; type: string }).code = "resource_missing"
        ;(missing as Error & { code: string; type: string }).type =
          "StripeInvalidRequestError"
        throw missing
      }

      return { id: customer.id }
    },
    createCustomer: async (params) => {
      const customer = await stripe.customers.create({
        email: params.email,
        metadata: params.metadata,
      })
      return { id: customer.id }
    },
    clearCustomerId: async (profileId) => {
      const { error } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: null })
        .eq("id", profileId)

      return { error: error ? { message: error.message } : null }
    },
    saveCustomerId: async (profileId, customerId) => {
      const { error } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", profileId)

      return { error: error ? { message: error.message } : null }
    },
    onStaleCustomer: ({ customerIdSuffix }) => {
      logger.warn("Cleared stale Stripe customer id missing in current mode.", {
        customerIdSuffix,
        profileId: profile.id,
      })
    },
  })

  if (!result.success) {
    logger.error("Unable to ensure Stripe customer for profile.", {
      error: result.error.message,
      profileId: profile.id,
    })
  }

  return result
}
