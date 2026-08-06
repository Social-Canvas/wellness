import type { Metadata } from "next"

import { Container, Section, SectionHeader } from "@/components/layout"
import { CtaBand } from "@/components/marketing"
import {
  MembershipAudienceTabs,
  MembershipPricingCards,
  ProgramOfferCard,
  ResetPlanOfferBand,
} from "@/features/checkout/components"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { buildCheckoutConsentUrl } from "@/features/checkout/utils/checkout-urls"
import {
  MEMBERSHIP_SECTION_COPY,
  parseMembershipAudienceParam,
} from "@/features/checkout/utils/membership-audience"
import { parseBillingParam } from "@/features/checkout/utils/membership-billing"
import {
  type MembershipCtaAccessSource,
  type MembershipCtaStatus,
  type MembershipPlanSlug,
  isLiveMembershipAccess,
  membershipPlanCtaFactsFromEffective,
} from "@/features/checkout/utils/membership-plan-cta-state"
import { listPlans } from "@/features/plans/services/plans.service"
import { isConfiguredStripePriceId } from "@/server/integrations/stripe/mode"
import { buildLiveBreathworkOfferView } from "@/features/checkout/utils/live-breathwork-offer-state"
import {
  BREATHWORK_ROADMAP,
  ELEVATE_BRAND,
  ELEVATE_PROGRAM_OFFERS,
  RESET_PLAN,
  VIP_COACHING_CTA_FEATURES,
  RETREATS_CTA_FEATURES,
} from "@/lib/constants/elevate-brand"
import { getPublicProgramOffers } from "@/lib/constants/catalog-visibility"
import { getProgramOfferBrandImage, BRAND_IMAGES } from "@/lib/brand/images"
import { buttonVariants } from "@/components/ui/button"
import { listProgramCatalogProducts } from "@/features/shop/services/shop.service"
import {
  hasConfirmedPublicTrialRegistration,
  listTrialOpenLiveSessions,
} from "@/features/live-sessions/services/live-sessions.service"
import { getEffectiveMembership } from "@/server/services/membership.service"
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

const PROGRAM_OFFERS_WITHOUT_RESET = getPublicProgramOffers(
  ELEVATE_PROGRAM_OFFERS
).filter((offer) => offer.slug !== RESET_PLAN.slug)

function programCheckoutHref(
  slug: string,
  publishedProgramSlugs: ReadonlySet<string>
): string | null {
  if (slug === "standalone-live-session") {
    return "/live-breathwork"
  }

  if (!publishedProgramSlugs.has(slug)) {
    return null
  }

  return buildCheckoutConsentUrl({
    type: "product",
    productSlug: slug,
  })
}

function asPlanSlug(value: string | null | undefined): MembershipPlanSlug | null {
  if (value === "plan-1" || value === "plan-2" || value === "plan-3") {
    return value
  }
  return null
}

type ProgramsPageProps = {
  searchParams: Promise<{
    membership?: string | string[]
    billing?: string | string[]
  }>
}

export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
  const params = await searchParams
  const initialAudience = parseMembershipAudienceParam(params.membership)
  const initialBilling = parseBillingParam(params.billing)

  const [productsResult, profileResult, trialSessionsResult, plansResult] =
    await Promise.all([
      listProgramCatalogProducts(),
      getCurrentProfile(),
      listTrialOpenLiveSessions(),
      listPlans(),
    ])

  // subscriptions.user_id is profiles.id — never auth.users id
  const userId = profileResult.success ? profileResult.data.id : null
  const membershipResult = userId
    ? await getEffectiveMembership(userId)
    : null
  const membership =
    membershipResult && membershipResult.success ? membershipResult.data : null

  const yearlyCheckoutAvailable =
    plansResult.success &&
    ["plan-1", "plan-2", "plan-3"].every((slug) => {
      const plan = plansResult.data.find((entry) => entry.slug === slug)
      const yearly = plan?.prices.find(
        (price) => price.billing_interval === "yearly" && price.is_active
      )
      return Boolean(yearly && isConfiguredStripePriceId(yearly.stripe_price_id))
    })

  const membershipFacts = membershipPlanCtaFactsFromEffective({
    isAuthenticated: Boolean(userId),
    source: (membership?.source ?? "none") as MembershipCtaAccessSource,
    status: (membership?.status ?? "none") as MembershipCtaStatus,
    effectiveTierSlug: asPlanSlug(membership?.effectiveTierSlug),
    billingInterval: membership?.billingInterval ?? null,
    hasPersonalBilling: membership?.hasPersonalBilling ?? false,
    cancelAtPeriodEnd: membership?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: membership?.currentPeriodEnd ?? null,
    scheduledPlanSlug: asPlanSlug(membership?.scheduledPlanSlug),
    scheduledPlanName: membership?.scheduledPlanName ?? null,
    scheduledBillingInterval: membership?.scheduledBillingInterval ?? null,
    organizationName: membership?.organizationName ?? null,
    yearlyCheckoutAvailable,
  })

  const membershipAccessActive = membership
    ? isLiveMembershipAccess(membership.status as MembershipCtaStatus)
    : false
  const hasLiveCapability =
    membership?.capabilities.includes("live_online_sessions") ?? false

  const trialSessions = trialSessionsResult.success
    ? trialSessionsResult.data
    : []
  const primaryTrial = trialSessions[0] ?? null

  let alreadyRegistered = false
  if (userId && primaryTrial) {
    const regResult = await hasConfirmedPublicTrialRegistration(
      userId,
      primaryTrial.id
    )
    alreadyRegistered = regResult.success ? regResult.data : false
  }

  const liveBreathworkView = buildLiveBreathworkOfferView({
    isAuthenticated: Boolean(userId),
    hasLiveOnlineSessionsCapability: hasLiveCapability,
    membershipAccessActive,
    alreadyRegisteredForSelectedSession: alreadyRegistered,
    hasEligibleUpcomingSession: Boolean(primaryTrial),
    registeredHref: primaryTrial
      ? `/dashboard/live-sessions/${primaryTrial.id}/join?trial=1`
      : "/dashboard/live-sessions",
    reserveHref: "/live-breathwork",
  })

  const publishedProductSlugs = new Set(
    (productsResult.success ? productsResult.data : []).map(
      (product) => product.slug
    )
  )

  const publishedProductsBySlug = new Map(
    (productsResult.success ? productsResult.data : []).map((product) => [
      product.slug,
      product,
    ])
  )

  const individualsPanel = (
    <MembershipPricingCards
      facts={membershipFacts}
      initialBilling={initialBilling}
    />
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
          <ResetPlanOfferBand contained={false} />
        </Container>
      </Section>

      <Section
        id="memberships"
        className="scroll-mt-32 overflow-x-hidden"
        padding="default"
      >
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            className="mx-auto max-w-3xl"
            eyebrow={MEMBERSHIP_SECTION_COPY.eyebrow}
            title={MEMBERSHIP_SECTION_COPY.title}
            subtitle={MEMBERSHIP_SECTION_COPY.subtitle}
          />

          <MembershipAudienceTabs
            initialAudience={initialAudience}
            individualsPanel={individualsPanel}
          />
        </div>
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
              const isLiveBreathwork = offer.slug === "standalone-live-session"
              const checkoutHref = isLiveBreathwork
                ? liveBreathworkView.ctaHref
                : programCheckoutHref(offer.slug, publishedProductSlugs)

              return (
                <div key={offer.slug} id={`offer-${offer.slug}`}>
                  <ProgramOfferCard
                    category={offer.category}
                    title={offer.title}
                    description={offer.description}
                    priceCents={priceCents}
                    currency={currency}
                    ctaLabel={
                      isLiveBreathwork
                        ? liveBreathworkView.ctaLabel
                        : offer.ctaLabel
                    }
                    ctaVariant={offer.ctaVariant}
                    checkoutHref={checkoutHref}
                    fallbackHref="#programs-offers"
                    image={getProgramOfferBrandImage(offer.slug)}
                    ctaDisabled={
                      isLiveBreathwork ? liveBreathworkView.ctaDisabled : false
                    }
                    supportingText={
                      isLiveBreathwork
                        ? liveBreathworkView.supportingText
                        : null
                    }
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
