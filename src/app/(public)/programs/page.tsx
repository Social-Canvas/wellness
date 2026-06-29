import type { Metadata } from "next"
import Link from "next/link"

import { Container, Navbar, Section, SectionHeader, Ticker } from "@/components/layout"
import { CtaBand } from "@/components/marketing"
import { buttonVariants } from "@/components/ui/button"
import { listPlans } from "@/features/plans/services/plans.service"
import type { PlanWithPrices } from "@/features/plans/types"
import { listProgramCatalogProducts } from "@/features/shop/services/shop.service"
import { formatProductPrice } from "@/features/shop/utils/format-product"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Programs & Membership",
  description:
    "Choose a membership plan or explore one-time wellness programs, masterclasses, and live sessions.",
}

const TICKER_MESSAGE =
  "Educational content only · not medical advice · Get 10% off your first program with code WELCOME10"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Programs", href: "/programs", active: true },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
] as const

const NAV_SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Podcast", href: "/podcast" },
] as const

const NAV_ACTIONS = [
  { label: "Log in", href: "/login", variant: "ghost" as const },
  { label: "Get started", href: "/signup", variant: "primary" as const },
]

type MembershipTier = {
  slug: string
  levelLabel: string
  featured: boolean
  features: string[]
  ctaVariant: "default" | "outline"
}

type ProgramOffer = {
  slug: string
  category: string
  title: string
  description: string
  priceCents: number
  priceNote?: string
  ctaLabel: string
  ctaVariant: "default" | "outline"
}

const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    slug: "plan-1",
    levelLabel: "Plan 1",
    featured: false,
    features: [
      "21 meditation classes (5 min each)",
      "Core course library (~30 videos, 20–40 min)",
      "New content added every week",
    ],
    ctaVariant: "outline",
  },
  {
    slug: "plan-2",
    levelLabel: "Plan 2",
    featured: true,
    features: [
      "Everything in Plan 1",
      "2 virtual live sessions per month (1 hour each)",
      "Recorded sessions added to your library",
    ],
    ctaVariant: "default",
  },
  {
    slug: "plan-3",
    levelLabel: "Plan 3",
    featured: false,
    features: [
      "Everything in Plan 2",
      "1 in-person live session per month (1 hour)",
      "Monthly member extras",
    ],
    ctaVariant: "outline",
  },
]

const PROGRAM_OFFERS: ProgramOffer[] = [
  {
    slug: "7-day-reset",
    category: "Program",
    title: "7-Day Reset",
    description:
      "Holistic wellness grocery list, manifestation breathwork, a stress and inflammation quiz, and community access.",
    priceCents: 4700,
    priceNote: "one time",
    ctaLabel: "Start",
    ctaVariant: "default",
  },
  {
    slug: "autoimmune-masterclass",
    category: "Masterclass",
    title: "Autoimmune Masterclass",
    description:
      "Five recorded sessions with workbook support and a completion certificate.",
    priceCents: 4700,
    priceNote: "one time",
    ctaLabel: "Learn more",
    ctaVariant: "outline",
  },
  {
    slug: "health-professional-session",
    category: "Session",
    title: "Health Professional Session",
    description: "A two-hour recorded session designed for health professionals.",
    priceCents: 6500,
    ctaLabel: "Book",
    ctaVariant: "outline",
  },
  {
    slug: "standalone-live-session",
    category: "Live session",
    title: "Standalone Live Session",
    description:
      "A one-off virtual live session with limited group size (25–30 participants).",
    priceCents: 5500,
    ctaLabel: "Book",
    ctaVariant: "outline",
  },
]

function formatMembershipPrice(plan: PlanWithPrices | undefined): {
  amount: string
  interval: string
} {
  const monthlyPrice = plan?.prices.find(
    (price) => price.billing_interval === "monthly" && price.is_active
  )

  if (monthlyPrice && monthlyPrice.amount > 0) {
    return {
      amount: formatProductPrice(monthlyPrice.amount, monthlyPrice.currency),
      interval: "/ mo",
    }
  }

  return {
    amount: "Monthly + annual",
    interval: "",
  }
}

function resolveProgramOfferHref(
  slug: string,
  publishedProgramSlugs: ReadonlySet<string>
): string {
  return publishedProgramSlugs.has(slug) ? `#offer-${slug}` : "#programs-offers"
}

function membershipSignupHref(planSlug: string): string {
  return `/signup?plan=${encodeURIComponent(planSlug)}`
}

export default async function ProgramsPage() {
  const [plansResult, productsResult] = await Promise.all([
    listPlans(),
    listProgramCatalogProducts(),
  ])

  const plansBySlug = new Map(
    (plansResult.success ? plansResult.data : [])
      .filter((plan) => plan.is_active)
      .map((plan) => [plan.slug, plan])
  )

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
    <>
      <Ticker>{TICKER_MESSAGE}</Ticker>

      <Navbar
        logo={{ accent: "Wellness", suffix: "Studio", href: "/" }}
        links={[...NAV_LINKS]}
        socialLinks={[...NAV_SOCIAL_LINKS]}
        actions={NAV_ACTIONS}
      />

      <main>
        <Section padding="default">
          <Container>
            <SectionHeader
              eyebrow="Membership"
              title="Choose your plan"
              subtitle="Your ongoing support system for guided wellness content. Move up a plan anytime and cancel whenever you like."
            />

            <div className="mt-9 grid grid-cols-1 gap-5 min-[861px]:grid-cols-3">
              {MEMBERSHIP_TIERS.map((tier) => {
                const plan = plansBySlug.get(tier.slug)
                const price = formatMembershipPrice(plan)

                return (
                  <article
                    key={tier.slug}
                    className={cn(
                      "relative flex flex-col rounded-[18px] border bg-surface p-[28px_26px] text-left",
                      tier.featured ? "border-2 border-blue" : "border-line"
                    )}
                  >
                    {tier.featured ? (
                      <span className="absolute top-[-13px] left-1/2 -translate-x-1/2 rounded-[20px] bg-blue px-3.5 py-1.5 text-[11px] font-bold tracking-[0.1em] text-white uppercase">
                        Most popular
                      </span>
                    ) : null}

                    <span className="text-[11.5px] font-bold tracking-[0.12em] text-green-deep uppercase">
                      {tier.levelLabel}
                    </span>
                    <h3 className="mt-1.5 font-display text-2xl font-medium text-ink">
                      Membership
                    </h3>
                    <div className="mt-1 mb-3.5 font-display text-[30px] font-semibold text-ink">
                      {price.amount}
                      {price.interval ? (
                        <small className="ml-1 font-body text-sm font-normal text-ink-soft">
                          {price.interval}
                        </small>
                      ) : null}
                    </div>

                    {plan?.description ? (
                      <p className="mb-3 text-sm text-ink-soft">{plan.description}</p>
                    ) : null}

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
                      href={membershipSignupHref(tier.slug)}
                      className={cn(
                        buttonVariants({
                          variant: tier.ctaVariant,
                          size: "block",
                        }),
                        "mt-auto"
                      )}
                    >
                      Join {tier.levelLabel}
                    </Link>
                  </article>
                )
              })}
            </div>
          </Container>
        </Section>

        <Section id="programs-offers" variant="soft" padding="default">
          <Container>
            <SectionHeader eyebrow="Programs" title="One-time programs & sessions" />

            <div className="mt-9 grid grid-cols-1 gap-5 min-[861px]:grid-cols-2">
              {PROGRAM_OFFERS.map((offer) => {
                const publishedProduct = publishedProductsBySlug.get(offer.slug)
                const priceCents = publishedProduct?.priceAmount ?? offer.priceCents
                const currency = publishedProduct?.currency ?? "usd"
                const href = resolveProgramOfferHref(offer.slug, publishedProductSlugs)

                return (
                  <article
                    key={offer.slug}
                    id={`offer-${offer.slug}`}
                    className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left"
                  >
                    <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-blue-soft to-green-soft">
                      <span className="absolute top-3 left-3 rounded-[20px] bg-[rgba(255,255,255,0.85)] px-2.5 py-1.5 text-[11px] font-bold tracking-[0.06em] text-green-deep uppercase">
                        {offer.category}
                      </span>
                      <span
                        aria-hidden
                        className="flex size-[42px] items-center justify-center rounded-full bg-blue"
                      >
                        <span className="ml-0.5 border-y-8 border-l-[13px] border-y-transparent border-l-white" />
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h4 className="font-display text-lg font-medium text-ink">
                        {offer.title}
                      </h4>
                      <p className="mt-1.5 mb-3.5 text-sm text-ink-soft">
                        {publishedProduct?.description ?? offer.description}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-3">
                        <span className="font-display text-lg font-semibold text-ink">
                          {formatProductPrice(priceCents, currency)}
                          {offer.priceNote ? (
                            <small className="ml-1 font-body text-xs font-normal text-ink-soft">
                              {offer.priceNote}
                            </small>
                          ) : null}
                        </span>

                        <Link
                          href={href}
                          className={cn(
                            buttonVariants({
                              variant: offer.ctaVariant,
                              size: "sm",
                            })
                          )}
                        >
                          {offer.ctaLabel}
                        </Link>
                      </div>
                    </div>
                  </article>
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
                title="VIP Package"
                description="Custom high-touch transformation program. Apply to enquire — pricing is customized."
                features={[
                  "Comprehensive holistic wellness testing",
                  "1:1 bi-weekly coaching calls",
                  "Supplements and personalized support",
                  "Extended membership access",
                  "Exclusive VIP retreat access",
                  "Private VIP support community",
                ]}
                price="By enquiry"
                priceNote="not a self-serve checkout"
                action={{ label: "Apply for VIP", href: "/vip" }}
              />
            </div>

            <div id="retreats-private-events">
              <CtaBand
                contained={false}
                variant="green"
                eyebrow="Live & in person"
                title="Retreats & Private Events"
                description="Weekend retreats and private events. Enquire for upcoming dates, formats, and pricing."
                price="Enquire"
                priceNote="lead capture only at launch"
                action={{ label: "Enquire", href: "/retreats" }}
              />
            </div>
          </Container>
        </Section>
      </main>
    </>
  )
}
