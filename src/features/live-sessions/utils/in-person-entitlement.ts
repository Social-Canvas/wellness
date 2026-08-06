/**
 * Prepared in-person experience entitlement model.
 *
 * Confirmed public copy (no period): "Includes one live in-person experience"
 * Unresolved: whether Platinum resets monthly / annually / never.
 *
 * Keep inactive — preserve current boolean `in_person_sessions` authorization
 * until the client confirms the reset period. Do not invent a period.
 */

export type InPersonResetPeriod = "monthly" | "annually" | "never"

export type InPersonExperienceConfig = {
  included: boolean
  includedQuantity: number | null
  /** null until the client confirms — do not invent. */
  resetPeriod: InPersonResetPeriod | null
  /**
   * When false, redeem/book against quantity is not enforced; existing
   * `in_person_sessions` capability remains the authorization source.
   */
  quantityEnforcementActive: boolean
  requiresAdministratorConfirmation: boolean
}

export type InPersonExperienceUsage = {
  includedQuantity: number | null
  redeemed: number
  remaining: number | null
  resetPeriod: InPersonResetPeriod | null
  active: boolean
}

export const IN_PERSON_PUBLIC_COPY =
  "Includes one live in-person experience" as const

/** Forbidden until reset period is confirmed. */
export const FORBIDDEN_IN_PERSON_PERIOD_PUBLIC_COPY = [
  "per month",
  "per year",
  "monthly in-person",
  "annual in-person",
] as const

export const IN_PERSON_EXPERIENCE_BY_PLAN: Record<
  string,
  InPersonExperienceConfig
> = {
  "plan-1": {
    included: false,
    includedQuantity: null,
    resetPeriod: null,
    quantityEnforcementActive: false,
    requiresAdministratorConfirmation: true,
  },
  "plan-2": {
    // Preserve existing capability authorization; public Gold copy no longer
    // leads with unrestricted in-person. Quantity rules remain inactive.
    included: true,
    includedQuantity: null,
    resetPeriod: null,
    quantityEnforcementActive: false,
    requiresAdministratorConfirmation: true,
  },
  "plan-3": {
    included: true,
    includedQuantity: 1,
    resetPeriod: null,
    quantityEnforcementActive: false,
    requiresAdministratorConfirmation: true,
  },
}

export function inPersonExperienceConfigForPlan(
  planSlug: string | null | undefined
): InPersonExperienceConfig | null {
  if (!planSlug) {
    return null
  }
  return IN_PERSON_EXPERIENCE_BY_PLAN[planSlug] ?? null
}

export function buildInPersonExperienceUsage(input: {
  config: InPersonExperienceConfig
  redeemed: number
}): InPersonExperienceUsage {
  if (!input.config.included || input.config.includedQuantity == null) {
    return {
      includedQuantity: input.config.includedQuantity,
      redeemed: 0,
      remaining: null,
      resetPeriod: input.config.resetPeriod,
      active: false,
    }
  }

  return {
    includedQuantity: input.config.includedQuantity,
    redeemed: input.redeemed,
    remaining: Math.max(0, input.config.includedQuantity - input.redeemed),
    resetPeriod: input.config.resetPeriod,
    active: input.config.quantityEnforcementActive,
  }
}

export function inPersonResetPeriodIsConfirmed(
  config: InPersonExperienceConfig
): boolean {
  return config.resetPeriod !== null
}

export function publicInPersonCopyOmitsUnconfirmedPeriod(
  copy: string
): boolean {
  const lower = copy.toLowerCase()
  return !FORBIDDEN_IN_PERSON_PERIOD_PUBLIC_COPY.some((phrase) =>
    lower.includes(phrase)
  )
}
