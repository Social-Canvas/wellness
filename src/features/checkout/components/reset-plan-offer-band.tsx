import { CtaBand } from "@/components/marketing"
import { RESET_PRODUCT_SLUG } from "@/features/checkout/constants/destinations"
import { resolveCurrentResetPlanOffer } from "@/features/checkout/services/reset-plan-offer.service"
import { buildCheckoutConsentUrl } from "@/features/checkout/utils/checkout-urls"
import {
  RESET_PLAN_PRICE_LABEL,
  RESET_PLAN_PRICE_NOTE,
} from "@/features/checkout/utils/reset-plan-offer-state"
import { BRAND_IMAGES } from "@/lib/brand/images"
import {
  RESET_PLAN,
  RESET_PLAN_CTA_FEATURES,
} from "@/lib/constants/elevate-brand"

type ResetPlanOfferBandProps = {
  contained?: boolean
}

/**
 * Server Component: entitlement-aware Reset Plan storefront card.
 * Access state is resolved only on the server — never from the browser.
 */
export async function ResetPlanOfferBand({
  contained = false,
}: ResetPlanOfferBandProps) {
  const offerResult = await resolveCurrentResetPlanOffer()

  const offer = offerResult.success
    ? offerResult.data
    : {
        state: "logged_out" as const,
        showPrice: true,
        price: RESET_PLAN_PRICE_LABEL,
        priceNote: RESET_PLAN_PRICE_NOTE,
        ctaLabel: "Start Reset Plan",
        ctaHref: buildCheckoutConsentUrl({
          type: "product",
          productSlug: RESET_PRODUCT_SLUG,
        }),
        allowsCheckout: true,
      }

  return (
    <CtaBand
      contained={contained}
      eyebrow="Start here"
      title={RESET_PLAN.name}
      description={RESET_PLAN.description}
      features={[...RESET_PLAN_CTA_FEATURES]}
      price={offer.price}
      priceNote={offer.priceNote ?? undefined}
      action={{ label: offer.ctaLabel, href: offer.ctaHref }}
      image={BRAND_IMAGES.productJournalReset}
    />
  )
}
