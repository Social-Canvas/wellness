"use server"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  createBillingPortalSession,
  createCheckoutSession,
  getCurrentSubscription,
} from "@/features/billing/services/billing.service"
import {
  applyImmediateBillingChange,
  previewImmediateBillingChange,
  schedulePersonalBillingChange,
  schedulePersonalPlanChange,
  type BillingChangePreview,
} from "@/features/billing/services/membership-lifecycle.service"
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

export async function schedulePersonalPlanChangeAction(input: {
  targetPlanSlug: string
  mode: "downgrade" | "cancel"
}): Promise<ActionResult<{ scheduled: true; effectiveAt: string | null }>> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  return schedulePersonalPlanChange({
    userId: profileResult.data,
    targetPlanSlug: input.targetPlanSlug,
    mode: input.mode,
  })
}

export async function schedulePersonalDowngradeAction(
  targetPlanSlug: "plan-1" | "plan-2" | "plan-3"
): Promise<ActionResult<{ scheduled: true; effectiveAt: string | null }>> {
  return schedulePersonalPlanChangeAction({
    targetPlanSlug,
    mode: "downgrade",
  })
}

export async function previewBillingChangeAction(input: {
  targetPlanSlug: "plan-1" | "plan-2" | "plan-3"
  targetBillingInterval: "monthly" | "yearly"
}): Promise<ActionResult<BillingChangePreview>> {
  const profileResult = await requireProfileId()
  if (!profileResult.success) {
    return profileResult
  }

  return previewImmediateBillingChange({
    userId: profileResult.data,
    targetPlanSlug: input.targetPlanSlug,
    targetBillingInterval: input.targetBillingInterval,
  })
}

export async function confirmBillingChangeAction(input: {
  targetPlanSlug: "plan-1" | "plan-2" | "plan-3"
  targetBillingInterval: "monthly" | "yearly"
}): Promise<
  ActionResult<
    | { scheduled: true; effectiveAt: string | null; message: string }
    | { applied: boolean; paymentRequired: boolean; message: string }
  >
> {
  const profileResult = await requireProfileId()
  if (!profileResult.success) {
    return profileResult
  }

  const preview = await previewImmediateBillingChange({
    userId: profileResult.data,
    targetPlanSlug: input.targetPlanSlug,
    targetBillingInterval: input.targetBillingInterval,
  })

  if (!preview.success) {
    return preview
  }

  if (preview.data.classification === "period_end") {
    return schedulePersonalBillingChange({
      userId: profileResult.data,
      targetPlanSlug: input.targetPlanSlug,
      targetBillingInterval: input.targetBillingInterval,
    })
  }

  return applyImmediateBillingChange({
    userId: profileResult.data,
    targetPlanSlug: input.targetPlanSlug,
    targetBillingInterval: input.targetBillingInterval,
  })
}
