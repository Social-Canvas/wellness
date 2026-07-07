export type CheckoutConsentType = "membership" | "product"

export type BuildCheckoutConsentUrlParams = {
  type: CheckoutConsentType
  planSlug?: string
  productSlug?: string
  interval?: "monthly" | "yearly"
}

export function buildCheckoutConsentUrl(params: BuildCheckoutConsentUrlParams): string {
  const search = new URLSearchParams({ type: params.type })

  if (params.planSlug) {
    search.set("planSlug", params.planSlug)
  }

  if (params.productSlug) {
    search.set("slug", params.productSlug)
  }

  if (params.interval) {
    search.set("interval", params.interval)
  }

  return `/checkout/consent?${search.toString()}`
}
