import "server-only"

import { env } from "@/lib/config"

import type { CheckoutConsentType } from "./checkout-urls"
import {
  buildCheckoutCancelUrlFromBase,
  buildCheckoutSuccessUrlFromBase,
} from "./stripe-return-url-builders"

export {
  CHECKOUT_SESSION_ID_PLACEHOLDER,
  buildCheckoutCancelUrlFromBase,
  buildCheckoutSuccessUrlFromBase,
} from "./stripe-return-url-builders"

export function buildCheckoutSuccessUrl(): string {
  return buildCheckoutSuccessUrlFromBase(env.NEXT_PUBLIC_APP_URL)
}

export function buildCheckoutCancelUrl(params?: {
  type?: CheckoutConsentType
}): string {
  return buildCheckoutCancelUrlFromBase(env.NEXT_PUBLIC_APP_URL, params)
}
