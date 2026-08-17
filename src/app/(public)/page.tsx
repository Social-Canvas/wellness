import type { Metadata } from "next"
import Link from "next/link"

import {
  FaqAccordion,
  HeroSection,
  StepsGrid,
  type HeroAction,
} from "@/components/marketing"
import { Container, Section } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import {
  HomepageMembershipOffers,
  ResetPlanOfferBand,
} from "@/features/checkout/components"
import {
  HOMEPAGE_NONPROFIT_SECTION,
  NONPROFIT_EXPLORE_CTA,
  NONPROFIT_INQUIRY_CTA,
  NONPROFIT_INQUIRY_HREF,
  NONPROFIT_LANDING_HREF,
} from "@/features/checkout/utils/membership-audience"
import { parseBillingParam } from "@/features/checkout/utils/membership-billing"
import { VideoTestimonialsSection } from "@/features/marketing-testimonials"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { SITE_SEO, buildPublicPageMetadata } from "@/lib/seo/site-seo"
import { cn } from "@/lib/utils"

export const metadata: Metadata = buildPublicPageMetadata({
  title: SITE_SEO.homeTitle,
  description: SITE_SEO.homeDescription,
  path: "/",
  absoluteTitle: true,
})

const HERO_EYEBROW = ELEVATE_BRAND.philosophy

const HERO_TITLE = "Regulate your nervous system."

const HERO_HIGHLIGHTED_TITLE = "Heal at the root."

const HERO_DESCRIPTION =
  "Elevate Health Solutions blends functional medicine, breathwork, and evidence-informed healing to help high-performing professionals move beyond burnout, anxiety, and depletion into clarity, resilience, and vibrant health."

const HERO_ACTIONS: HeroAction[] = [
  { label: "Start Reset Plan", href: "/programs#reset-plan", variant: "primary" },
  { label: "Explore memberships", href: "#memberships", variant: "ghost" },
]

const HERO_TRUST_ITEMS = [
  "Featured in Forbes",
  "Authority Magazine",
  "Best-selling author",
  "Functional medicine & breathwork",
]

const JOURNEY_STEPS = [
  {
    number: "1",
    title: "Ground",
    description:
      "Nervous system safety first: release survival mode, reduce burnout, and teach the body it is safe to rest.",
  },
  {
    number: "2",
    title: "Release",
    description:
      "Move stored stress and emotional patterns through guided breathwork, gut support, and hormonal balance.",
  },
  {
    number: "3",
    title: "Align & expand",
    description:
      "Embody sustainable transformation: clarity, resilience, purpose, and leadership from a regulated nervous system.",
  },
]

const FAQ_ITEMS = [
  {
    question: "Is this medical care?",
    answer:
      "Elevate provides educational functional medicine and breathwork content. It is not a substitute for medical diagnosis or treatment. Always consult your physician.",
  },
  {
    question: "How is this different from conventional medicine?",
    answer:
      "Conventional care often manages symptoms. Dr. Pattani's approach identifies root causes (nervous system dysregulation, inflammation, hormones, and lifestyle) using science + soul.",
  },
  {
    question: "Where do I start?",
    answer:
      "Most people begin with the Reset Plan, then choose Elevate Core, Gold, or Platinum depending on the level of support and live access they want.",
  },
  {
    question: "Are sessions virtual?",
    answer:
      "Yes. Core content and many sessions are delivered virtually. Elevate Platinum includes the full live Elevate experience; retreats are offered separately.",
  },
  {
    question: "Is this safe alongside my medications?",
    answer:
      "Dr. Pattani is a Doctor of Pharmacy with deep pharmacology expertise. Always keep your prescribing physician informed about any program you join.",
  },
]

type HomePageProps = {
  searchParams: Promise<{
    billing?: string | string[]
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const initialBilling = parseBillingParam(params.billing)

  return (
    <main>
      <HeroSection
        eyebrow={HERO_EYEBROW}
        title={HERO_TITLE}
        highlightedTitle={HERO_HIGHLIGHTED_TITLE}
        description={HERO_DESCRIPTION}
        actions={HERO_ACTIONS}
        trustItems={HERO_TRUST_ITEMS}
        image={BRAND_IMAGES.founderTempleMeditation}
      />

      <StepsGrid
        eyebrow="The Elevate journey"
        title="A structured path to nervous system transformation"
        steps={JOURNEY_STEPS}
      />

      <Section padding="default">
        <Container>
          <ResetPlanOfferBand contained={false} />
        </Container>
      </Section>

      <HomepageMembershipOffers
        initialBilling={initialBilling}
        footerCta={{ label: "View all programs & sessions", href: "/programs" }}
      />

      <Section id="for-nonprofits" variant="soft" padding="default">
        <Container className="mx-auto max-w-3xl text-center">
          <p className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-green-deep">
            {HOMEPAGE_NONPROFIT_SECTION.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.375rem,2.8vw,1.875rem)] font-medium text-ink">
            {HOMEPAGE_NONPROFIT_SECTION.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-[540px] text-base leading-relaxed text-ink-soft">
            {HOMEPAGE_NONPROFIT_SECTION.body}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={NONPROFIT_LANDING_HREF}
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              {NONPROFIT_EXPLORE_CTA}
            </Link>
            <Link
              href={NONPROFIT_INQUIRY_HREF}
              className={cn(buttonVariants({ variant: "outline", size: "default" }))}
            >
              {NONPROFIT_INQUIRY_CTA}
            </Link>
          </div>
        </Container>
      </Section>

      <VideoTestimonialsSection />

      <FaqAccordion eyebrow="Questions, answered" title="Before you begin" items={FAQ_ITEMS} />
    </main>
  )
}
