import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section, SectionHeader } from "@/components/layout"
import { CtaBand } from "@/components/marketing"
import { ProgramOfferCard } from "@/features/checkout/components"
import { buildCheckoutConsentUrl } from "@/features/checkout/utils/checkout-urls"
import {
  BREATHWORK_ROADMAP,
  ELEVATE_BRAND,
  ELEVATE_MEMBERSHIPS,
  ELEVATE_PROGRAM_OFFERS,
  RESET_PLAN,
  RESET_PLAN_CTA_FEATURES,
  VIP_COACHING_CTA_FEATURES,
  RETREATS_CTA_FEATURES,
} from "@/lib/constants/elevate-brand"
import { getProgramOfferBrandImage, BRAND_IMAGES } from "@/lib/brand/images"
import { buttonVariants } from "@/components/ui/button"
import { listProgramCatalogProducts } from "@/features/shop/services/shop.service"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: `Programs & Memberships — ${ELEVATE_BRAND.name}`,
  description:
    "Reset Plan entry offer, Elevate Core, Gold, and Platinum memberships — a progressive breathwork and nervous system healing journey.",
}

const PROGRAMS_NAV = [
  { label: "Start here", href: "#reset-plan" },
  { label: "Memberships", href: "#memberships" },
  { label: "Programs", href: "#programs-offers" },
  { label: "VIP coaching", href: "#vip-package" },
  { label: "Retreats", href: "#retreats-private-events" },
] as const

const PROGRAM_OFFERS_WITHOUT_RESET = ELEVATE_PROGRAM_OFFERS.filter(
  (offer) => offer.slug !== RESET_PLAN.slug
)

function programCheckoutHref(slug: string, publishedProgramSlugs: ReadonlySet<string>): string | null {
  if (!publishedProgramSlugs.has(slug)) {
    return null
  }

  return buildCheckoutConsentUrl({
    type: "product",
    productSlug: slug,
  })
}

function membershipCheckoutHref(planSlug: string): string {
  return buildCheckoutConsentUrl({
    type: "membership",
    planSlug,
    interval: "monthly",
  })
}

export default async function ProgramsPage() {
  const productsResult = await listProgramCatalogProducts()

  const publishedProductSlugs = new Set(
    (productsResult.success ? productsResult.data : []).map((product) => product.slug)
  )

  const publishedProductsBySlug = new Map(
    (productsResult.success ? productsResult.data : []).map((product) => [
      product.slug,
      product,
    ])
  )

  return (
    <main>
      <Section padding="default">
        <Container>
          <SectionHeader
            align="center"
            eyebrow="The Elevate journey"
            title="Progressive nervous system transformation"
            subtitle={`A structured path — ${BREATHWORK_ROADMAP.framework} — designed for long-term regulation, not isolated courses.`}
          />

          <nav
            aria-label="Programs page sections"
            className="mt-8 flex flex-wrap justify-center gap-2"
          >
            {PROGRAMS_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-full"
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-line bg-surface px-6 py-6 text-center shadow-sm">
            <p className="font-display text-lg font-medium text-ink">
              {BREATHWORK_ROADMAP.framework}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Year 1: {BREATHWORK_ROADMAP.yearOneFocus}. Year 2:{" "}
              {BREATHWORK_ROADMAP.yearTwoFocus}. Year 3:{" "}
              {BREATHWORK_ROADMAP.yearThreeFocus}.
            </p>
          </div>
        </Container>
      </Section>

      <Section id="reset-plan" variant="soft" padding="default">
        <Container>
          <CtaBand
            contained={false}
            eyebrow="Start here"
            title={RESET_PLAN.name}
            description={RESET_PLAN.description}
            features={[...RESET_PLAN_CTA_FEATURES]}
            price={RESET_PLAN.priceLabel}
            priceNote="one-time entry offer"
            action={{
              label: "Start Reset Plan",
              href: buildCheckoutConsentUrl({
                type: "product",
                productSlug: RESET_PLAN.slug,
              }),
            }}
            image={BRAND_IMAGES.productJournalReset}
          />
        </Container>
      </Section>

      <Section id="memberships" padding="default">
        <Container>
          <SectionHeader
            eyebrow="Memberships"
            title="Elevate Core, Gold & Platinum"
            subtitle="Choose the level of support, live access, and implementation guidance that fits your season. Elevate Platinum is the only tier that includes the full live Elevate experience."
          />

          <div className="mt-9 grid grid-cols-1 gap-5 min-[861px]:grid-cols-3">
            {ELEVATE_MEMBERSHIPS.map((tier) => (
              <article
                key={tier.slug}
                className={cn(
                  "relative flex flex-col rounded-[18px] border bg-surface p-[28px_26px] text-left shadow-sm",
                  tier.featured ? "border-2 border-blue" : "border-line"
                )}
              >
                {tier.featured ? (
                  <span className="absolute top-[-13px] left-1/2 -translate-x-1/2 rounded-[20px] bg-blue px-3.5 py-1.5 text-[11px] font-bold tracking-[0.1em] text-white uppercase">
                    Most popular
                  </span>
                ) : null}

                <span className="text-[11.5px] font-bold tracking-[0.12em] text-green-deep uppercase">
                  Membership
                </span>
                <h3 className="mt-1.5 font-display text-2xl font-medium text-ink">
                  {tier.name}
                </h3>
                <div className="mt-1 mb-3.5 font-display text-[30px] font-semibold text-ink">
                  {tier.priceLabel}
                  <small className="ml-1 font-body text-sm font-normal text-ink-soft">
                    / mo
                  </small>
                </div>

                <p className="mb-3 text-sm text-ink-soft">{tier.whoItIsFor}</p>

                <ul className="mb-5 list-none">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="relative py-1.5 pl-[22px] text-sm text-ink-soft"
                    >
                      <span
                        aria-hidden
                        className="absolute left-0 font-bold text-blue"
                      >
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={membershipCheckoutHref(tier.slug)}
                  className={cn(
                    buttonVariants({
                      variant: tier.ctaVariant,
                      size: "block",
                    }),
                    "mt-auto"
                  )}
                >
                  Join {tier.name}
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section id="programs-offers" variant="soft" padding="default">
        <Container>
          <SectionHeader
            eyebrow="Programs & sessions"
            title="Build on your membership"
            subtitle="Focused programs and live sessions that deepen specific phases of your healing journey."
          />

          <div className="mt-9 grid grid-cols-1 gap-5 min-[861px]:grid-cols-2">
            {PROGRAM_OFFERS_WITHOUT_RESET.map((offer) => {
              const publishedProduct = publishedProductsBySlug.get(offer.slug)
              const priceCents = publishedProduct?.priceAmount ?? 4700
              const currency = publishedProduct?.currency ?? "usd"
              const checkoutHref = programCheckoutHref(offer.slug, publishedProductSlugs)

              return (
                <div key={offer.slug} id={`offer-${offer.slug}`}>
                  <ProgramOfferCard
                    category={offer.category}
                    title={offer.title}
                    description={offer.description}
                    priceCents={priceCents}
                    currency={currency}
                    ctaLabel={offer.ctaLabel}
                    ctaVariant={offer.ctaVariant}
                    checkoutHref={checkoutHref}
                    fallbackHref="#programs-offers"
                    image={getProgramOfferBrandImage(offer.slug)}
                  />
                </div>
              )
            })}
          </div>
        </Container>
      </Section>

      <Section padding="default">
        <Container className="space-y-[18px]">
          <div id="vip-package">
            <CtaBand
              contained={false}
              eyebrow="Premium 1:1"
              title="VIP Coaching with Dr. Pattani"
              description="The 7-Step PATTANI Protocol — advanced diagnostics, one-on-one coaching, and personalized healing strategies for high-touch transformation."
              features={[...VIP_COACHING_CTA_FEATURES]}
              price="By enquiry"
              priceNote="customized high-touch program"
              action={{ label: "Apply for VIP", href: "/vip" }}
              image={BRAND_IMAGES.founderCoachingTreePose}
            />
          </div>

          <div id="retreats-private-events">
            <CtaBand
              contained={false}
              variant="green"
              eyebrow="Live & in person"
              title="Retreats & Private Events"
              description="Immersive breathwork, sound healing, and functional medicine retreats — enquire for upcoming dates and private event formats."
              features={[...RETREATS_CTA_FEATURES]}
              price="Enquire"
              priceNote="upcoming dates shared on enquiry"
              action={{ label: "Enquire", href: "/retreats" }}
              image={BRAND_IMAGES.retreatSpiritual}
            />
          </div>
        </Container>
      </Section>
    </main>
  )
}
