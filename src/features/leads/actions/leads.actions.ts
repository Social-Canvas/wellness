"use server"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  TURNSTILE_USER_ERROR,
  verifyTurnstileToken,
} from "@/features/bot-protection/utils/turnstile"
import {
  submitLead,
  submitNonprofitPartnership,
} from "@/features/leads/services/leads.service"
import type { SubmitLeadInput } from "@/features/leads/schemas/submit-lead"
import type { SubmitNonprofitPartnershipInput } from "@/features/leads/schemas/submit-nonprofit-partnership"
import {
  mergeAttributionMetadata,
  readAttributionFromCookies,
} from "@/lib/attribution/cookie"
import { resolveClientIp } from "@/lib/http/client-ip"

async function guardPublicForm(
  token: string | null | undefined
): Promise<ActionResult<string>> {
  const clientIp = await resolveClientIp()
  const turnstile = await verifyTurnstileToken({ token, ip: clientIp })
  if (!turnstile.ok) {
    return {
      success: false,
      error: { code: turnstile.code, message: TURNSTILE_USER_ERROR },
    }
  }
  return { success: true, data: clientIp }
}

export async function submitLeadAction(
  input: SubmitLeadInput
): Promise<ActionResult<{ id: string; analyticsEligible: boolean }>> {
  const guard = await guardPublicForm(input.turnstileToken)
  if (!guard.success) {
    return guard
  }
  const attribution = await readAttributionFromCookies()
  return submitLead(
    {
      ...input,
      metadata: mergeAttributionMetadata(input.metadata, attribution),
    },
    { clientIp: guard.data }
  )
}

export async function submitNonprofitPartnershipAction(
  input: SubmitNonprofitPartnershipInput
): Promise<ActionResult<{ id: string; analyticsEligible: boolean }>> {
  const guard = await guardPublicForm(input.turnstileToken)
  if (!guard.success) {
    return guard
  }
  return submitNonprofitPartnership(input, { clientIp: guard.data })
}
