/**
 * Pure Reset Plan storefront offer state.
 * Entitlement facts must be resolved server-side before calling these helpers.
 * Never trust browser-supplied access flags.
 *
 * Kept dependency-free (no path aliases) so Node unit tests can import it
 * directly — same pattern as preview-eligibility.ts.
 */

export const RESET_PLAN_PRICE_LABEL = "$47"
export const RESET_PLAN_PRICE_NOTE = "one-time entry offer"

/** Canonical Reset course library path (must match destinations.RESET_LIBRARY_PATH). */
export const RESET_PLAN_COURSE_HREF =
  "/dashboard/library/5d5d648a-9038-4cff-b37d-7f5e10f34982" as const

/** Canonical Reset product slug (must match destinations.RESET_PRODUCT_SLUG). */
export const RESET_PLAN_PRODUCT_SLUG = "7-day-reset" as const

export type ResetPlanAccessSource =
  | "none"
  | "purchase"
  | "plan"
  | "complimentary"
  | "other"

export type ResetPlanProgressKind = "none" | "in_progress" | "complete"

export type ResetPlanOfferState =
  | "logged_out"
  | "no_access"
  | "purchased"
  | "included_in_plan"
  | "access_active"
  | "activating"

export type ResetPlanOfferFacts = {
  isAuthenticated: boolean
  hasCourseAccess: boolean
  accessSource: ResetPlanAccessSource
  isFulfillmentPending: boolean
  progress: ResetPlanProgressKind
  checkoutHref: string
  courseHref?: string
  purchasePriceLabel?: string
}

export type ResetPlanOfferView = {
  state: ResetPlanOfferState
  showPrice: boolean
  price: string
  priceNote: string | null
  ctaLabel: string
  ctaHref: string
  allowsCheckout: boolean
}

export function resolveResetPlanProgressKind(input: {
  completedLessons: number
  progressPercentage: number
}): ResetPlanProgressKind {
  if (input.progressPercentage >= 100) {
    return "complete"
  }

  if (input.completedLessons > 0 || input.progressPercentage > 0) {
    return "in_progress"
  }

  return "none"
}

export function resolveResetPlanAccessSource(input: {
  hasCourseAccess: boolean
  viaPurchase: boolean
  viaComplimentary: boolean
  viaSubscription: boolean
}): ResetPlanAccessSource {
  if (!input.hasCourseAccess) {
    return "none"
  }

  if (input.viaPurchase) {
    return "purchase"
  }

  if (input.viaComplimentary) {
    return "complimentary"
  }

  if (input.viaSubscription) {
    return "plan"
  }

  return "other"
}

export function progressAwareResetPlanCtaLabel(
  progress: ResetPlanProgressKind
): string {
  switch (progress) {
    case "complete":
      return "Review Reset Plan"
    case "in_progress":
      return "Continue Reset Plan"
    default:
      return "Start Reset Plan"
  }
}

/**
 * Maps trusted server facts to the Reset Plan card presentation.
 * Purchase price remains for public/no-access only — never for entitled users.
 */
export function buildResetPlanOfferView(
  facts: ResetPlanOfferFacts
): ResetPlanOfferView {
  const courseHref = facts.courseHref ?? RESET_PLAN_COURSE_HREF
  const priceLabel = facts.purchasePriceLabel ?? RESET_PLAN_PRICE_LABEL

  if (!facts.isAuthenticated) {
    return {
      state: "logged_out",
      showPrice: true,
      price: priceLabel,
      priceNote: RESET_PLAN_PRICE_NOTE,
      ctaLabel: "Start Reset Plan",
      ctaHref: facts.checkoutHref,
      allowsCheckout: true,
    }
  }

  if (facts.hasCourseAccess) {
    const ctaLabel = progressAwareResetPlanCtaLabel(facts.progress)

    if (facts.accessSource === "purchase") {
      return {
        state: "purchased",
        showPrice: false,
        price: "Purchased",
        priceNote: null,
        ctaLabel,
        ctaHref: courseHref,
        allowsCheckout: false,
      }
    }

    if (facts.accessSource === "plan") {
      return {
        state: "included_in_plan",
        showPrice: false,
        price: "Included in your plan",
        priceNote: null,
        ctaLabel,
        ctaHref: courseHref,
        allowsCheckout: false,
      }
    }

    return {
      state: "access_active",
      showPrice: false,
      price: "Access active",
      priceNote: null,
      ctaLabel,
      ctaHref: courseHref,
      allowsCheckout: false,
    }
  }

  if (facts.isFulfillmentPending) {
    return {
      state: "activating",
      showPrice: false,
      price: "Activating access…",
      priceNote: null,
      ctaLabel: "Go to My Library",
      ctaHref: "/dashboard/library",
      allowsCheckout: false,
    }
  }

  // Expired / revoked / never entitled — purchase state.
  return {
    state: "no_access",
    showPrice: true,
    price: priceLabel,
    priceNote: RESET_PLAN_PRICE_NOTE,
    ctaLabel: "Start Reset Plan",
    ctaHref: facts.checkoutHref,
    allowsCheckout: true,
  }
}

/**
 * True when Checkout must refuse session creation because the user already
 * has access to the course this product grants. Does not block unrelated
 * products (ebooks, sessions) that intentionally allow repurchase.
 */
export function shouldRefuseCheckoutForExistingResetAccess(input: {
  productSlug: string | null | undefined
  grantedCourseId: string | null | undefined
  hasCourseAccess: boolean
}): boolean {
  if (!input.hasCourseAccess) {
    return false
  }

  if (input.grantedCourseId) {
    return true
  }

  if (input.productSlug === RESET_PLAN_PRODUCT_SLUG) {
    return true
  }

  return false
}
