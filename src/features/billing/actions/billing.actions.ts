"use server"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  createBillingPortalSession,
  createCheckoutSession,
  getCurrentSubscription,
} from "@/features/billing/services/billing.service"
import type {
  BillingPortalSessionResult,
  CheckoutSessionResult,
  CurrentSubscription,
} from "@/features/billing/types"

async function requireProfileId(): Promise<ActionResult<string>> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return profileResult
  }

  return { success: true, data: profileResult.data.id }
}

export async function createCheckoutSessionAction(
  planPriceId: string
): Promise<ActionResult<CheckoutSessionResult>> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  return createCheckoutSession(profileResult.data, planPriceId)
}

export async function createBillingPortalSessionAction(): Promise<
  ActionResult<BillingPortalSessionResult>
> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  return createBillingPortalSession(profileResult.data)
}

export async function getCurrentSubscriptionAction(): Promise<
  ActionResult<CurrentSubscription | null>
> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  return getCurrentSubscription(profileResult.data)
}
