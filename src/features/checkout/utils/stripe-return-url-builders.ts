import type { CheckoutConsentType } from "./checkout-urls"

/**
 * Stripe replaces the literal `{CHECKOUT_SESSION_ID}` placeholder after payment.
 * Do not URL-encode the braces — Stripe requires the exact token.
 */
export const CHECKOUT_SESSION_ID_PLACEHOLDER = "{CHECKOUT_SESSION_ID}"

export function buildCheckoutSuccessUrlFromBase(appUrl: string): string {
  return `${appUrl}/checkout/success?session_id=${CHECKOUT_SESSION_ID_PLACEHOLDER}`
}

export function buildCheckoutCancelUrlFromBase(
  appUrl: string,
  params?: { type?: CheckoutConsentType }
): string {
  const base = `${appUrl}/checkout/cancelled`

  if (!params?.type) {
    return base
  }

  const search = new URLSearchParams({ type: params.type })
  return `${base}?${search.toString()}`
}
