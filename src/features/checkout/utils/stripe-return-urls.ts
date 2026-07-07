import "server-only"

import { env } from "@/lib/config"

import type { CheckoutConsentType } from "./checkout-urls"

export function buildCheckoutSuccessUrl(params: {
  type: CheckoutConsentType
  item: string
  returnTo?: string
}): string {
  const search = new URLSearchParams({
    type: params.type,
    item: params.item,
  })

  if (params.returnTo) {
    search.set("returnTo", params.returnTo)
  }

  return `${env.NEXT_PUBLIC_APP_URL}/checkout/success?${search.toString()}`
}

export function buildCheckoutCancelUrl(params: {
  type: CheckoutConsentType
  returnTo: string
}): string {
  const search = new URLSearchParams({
    type: params.type,
    returnTo: params.returnTo,
  })

  return `${env.NEXT_PUBLIC_APP_URL}/checkout/cancel?${search.toString()}`
}
