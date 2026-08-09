"use client"

import Link from "next/link"

import { BrandImage } from "@/components/media"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"
import { buttonVariants } from "@/components/ui/button"
import {
  MembershipBillingSync,
  MembershipBillingToggle,
} from "@/features/checkout/components/membership-billing-toggle"
import { buildCheckoutConsentUrl } from "@/features/checkout/utils/checkout-urls"
import {
  billingUrlToInterval,
  type BillingUrlValue,
} from "@/features/checkout/utils/membership-billing"
import { BRAND_IMAGES, type BrandImageAsset } from "@/lib/brand/images"
import { ELEVATE_MEMBERSHIPS } from "@/lib/constants/elevate-brand"
import { getMembershipPriceQuote } from "@/lib/constants/membership-pricing"
import { cn } from "@/lib/utils"

const MEMBERSHIP_IMAGES: BrandImageAsset[] = [
  BRAND_IMAGES.meditationSession,
  BRAND_IMAGES.heroBreathwork,
  BRAND_IMAGES.coachingVirtual,
]

type HomepageMembershipOffersProps = {
  initialBilling: BillingUrlValue
  footerCta?: { label: string; href: string }
}

/**
 * Homepage membership image cards with the same Monthly/Annual toggle
 * and Most Popular treatment used on Programs.
 */
export function HomepageMembershipOffers({
  initialBilling,
  footerCta,
}: HomepageMembershipOffersProps) {
  return (
    <MembershipBillingSync initialBilling={initialBilling}>
      {({ billing, setBilling }) => (
        <Section id="memberships">
          <Container className="text-center">
            <SectionHeader
              align="center"
              eyebrow="Memberships"
              title="Elevate Core, Gold & Platinum"
            />

            <div className="mt-8">
              <MembershipBillingToggle value={billing} onChange={setBilling} />
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 min-[861px]:grid-cols-3">
              {ELEVATE_MEMBERSHIPS.map((tier, index) => {
                const quote = getMembershipPriceQuote(
                  tier.slug,
                  billingUrlToInterval(billing)
                )
                const href = buildCheckoutConsentUrl({
                  type: "membership",
                  planSlug: tier.slug,
                  interval: billing === "annual" ? "yearly" : "monthly",
                })

                return (
                  <article
                    key={tier.slug}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-2xl border bg-surface text-left shadow-sm",
                      tier.featured ? "border-2 border-blue" : "border-line"
                    )}
                  >
                    {tier.featured ? (
                      <span className="absolute top-3 right-3 z-10 rounded-[20px] bg-blue px-2.5 py-1.5 text-[11px] font-bold tracking-[0.06em] text-white uppercase shadow-sm">
                        Most popular
                      </span>
                    ) : null}

                    <div className="relative aspect-video overflow-hidden">
                      <BrandImage
                        image={
                          MEMBERSHIP_IMAGES[index] ?? BRAND_IMAGES.meditationSession
                        }
                        containerClassName="absolute inset-0"
                        sizes="(max-width: 860px) 100vw, 33vw"
                      />
                      <span className="absolute top-3 left-3 rounded-[20px] bg-[rgba(255,255,255,0.9)] px-2.5 py-1.5 text-[11px] font-bold tracking-[0.06em] text-green-deep uppercase backdrop-blur-sm">
                        Membership
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-lg font-medium text-ink">
                        {tier.name}
                      </h3>
                      <p className="mt-1.5 mb-3.5 text-sm text-ink-soft">
                        {tier.whoItIsFor}
                      </p>

                      {quote.accessiblePriceSummary ? (
                        <p className="sr-only">{quote.accessiblePriceSummary}</p>
                      ) : null}

                      <div
                        className="mt-auto flex flex-wrap items-end justify-between gap-3"
                        aria-hidden={
                          quote.accessiblePriceSummary ? true : undefined
                        }
                      >
                        <div className="min-w-0 text-left">
                          <div className="font-display text-lg font-semibold text-ink">
                            {quote.primaryLabel}{" "}
                            <small className="font-body text-xs font-normal text-ink-soft">
                              {quote.cadenceSuffix}
                            </small>
                          </div>
                          {quote.savingsBadge ? (
                            <p className="mt-1 text-[11px] font-semibold tracking-wide text-green-deep uppercase">
                              {quote.savingsBadge}
                            </p>
                          ) : null}
                          {quote.equivalentMonthlyLabel ? (
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {quote.equivalentMonthlyLabel}
                            </p>
                          ) : null}
                        </div>
                        <Link
                          href={href}
                          className={cn(
                            buttonVariants({
                              variant: tier.featured ? "default" : "outline",
                              size: "sm",
                            }),
                            "shrink-0"
                          )}
                        >
                          Join {tier.name}
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {footerCta ? (
              <div className="mt-8">
                <Link
                  href={footerCta.href}
                  className={cn(
                    buttonVariants({ variant: "default", size: "default" })
                  )}
                >
                  {footerCta.label}
                </Link>
              </div>
            ) : null}
          </Container>
        </Section>
      )}
    </MembershipBillingSync>
  )
}
