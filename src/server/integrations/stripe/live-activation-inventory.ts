/**
 * Controlled live Stripe activation inventory.
 *
 * Hidden catalog rows stay in the list for explicit exclusion reporting —
 * they must not receive live Products/Prices or public Checkout.
 */

export const HEALTH_PROFESSIONAL_SESSION_LIVE_SLUG =
  "health-professional-session" as const

export type LiveStripeActivationStatus =
  | "eligible"
  | "hidden"
  | "enquiry_only"
  | "deferred"

export type LiveStripeActivationItem = {
  slug: string
  title: string
  kind: "membership" | "product"
  status: LiveStripeActivationStatus
  liveCheckout: boolean
  livePrice: boolean
  reportLine: string
}

export const LIVE_STRIPE_ACTIVATION_INVENTORY = [
  {
    slug: "plan-1",
    title: "Elevate Core",
    kind: "membership",
    status: "eligible",
    liveCheckout: true,
    livePrice: true,
    reportLine: "Elevate Core — eligible — live Checkout — live Price",
  },
  {
    slug: "plan-2",
    title: "Elevate Gold",
    kind: "membership",
    status: "eligible",
    liveCheckout: true,
    livePrice: true,
    reportLine: "Elevate Gold — eligible — live Checkout — live Price",
  },
  {
    slug: "plan-3",
    title: "Elevate Platinum",
    kind: "membership",
    status: "eligible",
    liveCheckout: true,
    livePrice: true,
    reportLine: "Elevate Platinum — eligible — live Checkout — live Price",
  },
  {
    slug: "7-day-reset",
    title: "7-Day Reset",
    kind: "product",
    status: "eligible",
    liveCheckout: true,
    livePrice: true,
    reportLine: "7-Day Reset — eligible — live Checkout — live Price",
  },
  {
    slug: "ebook-1",
    title: "Clean Living Recipes",
    kind: "product",
    status: "eligible",
    liveCheckout: true,
    livePrice: true,
    reportLine: "Clean Living Recipes — eligible — live Checkout — live Price",
  },
  {
    slug: "autoimmune-masterclass",
    title: "Autoimmune Masterclass",
    kind: "product",
    status: "deferred",
    liveCheckout: false,
    livePrice: false,
    reportLine:
      "Autoimmune Masterclass — deferred — no live Checkout — no live Price",
  },
  {
    slug: "standalone-live-session",
    title: "Live Breathwork Trial",
    kind: "product",
    status: "deferred",
    liveCheckout: false,
    livePrice: false,
    reportLine:
      "Live Breathwork Trial — deferred — no live Checkout — no live Price (catalog $55 pending app-config approval + sandbox E2E; Health Professional remains hidden; nonprofit/VIP/Retreats enquiry-only)",
  },
  {
    slug: HEALTH_PROFESSIONAL_SESSION_LIVE_SLUG,
    title: "Health Professional Session",
    kind: "product",
    status: "hidden",
    liveCheckout: false,
    livePrice: false,
    reportLine:
      "Health Professional Session — hidden — no live Checkout — no live Price",
  },
  {
    slug: "vip-package",
    title: "VIP Coaching",
    kind: "product",
    status: "enquiry_only",
    liveCheckout: false,
    livePrice: false,
    reportLine: "VIP Coaching — enquiry_only — no live Checkout — no live Price",
  },
  {
    slug: "retreats-private-events",
    title: "Retreats & Private Events",
    kind: "product",
    status: "enquiry_only",
    liveCheckout: false,
    livePrice: false,
    reportLine:
      "Retreats & Private Events — enquiry_only — no live Checkout — no live Price",
  },
] as const satisfies readonly LiveStripeActivationItem[]

export function getLiveStripeActivationItem(
  slug: string
): LiveStripeActivationItem | undefined {
  return LIVE_STRIPE_ACTIVATION_INVENTORY.find((item) => item.slug === slug)
}

/** True only for inventory rows approved for live Checkout + live Price. */
export function isLiveStripeCheckoutEligible(slug: string): boolean {
  const item = getLiveStripeActivationItem(slug)
  return Boolean(
    item && item.status === "eligible" && item.liveCheckout && item.livePrice
  )
}

export function formatLiveStripeActivationReport(
  slug: string
): string | undefined {
  return getLiveStripeActivationItem(slug)?.reportLine
}
