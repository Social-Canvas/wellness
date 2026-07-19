import type { Metadata } from "next"
import Link from "next/link"

import {
  FaqAccordion,
  HeroSection,
  OfferCardsSection,
  StepsGrid,
  TestimonialGrid,
  type HeroAction,
} from "@/components/marketing"
import { Container, Section } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import { ResetPlanOfferBand } from "@/features/checkout/components"
import { buildCheckoutConsentUrl } from "@/features/checkout/utils/checkout-urls"
import { ELEVATE_BRAND, ELEVATE_MEMBERSHIPS } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: `${ELEVATE_BRAND.name} — Functional Medicine & Breathwork`,
  description:
    "Science + soul for nervous system regulation, functional medicine, and root-cause healing with Dr. Deepa Pattani.",
}

const HERO_EYEBROW = ELEVATE_BRAND.philosophy

const HERO_TITLE = "Regulate your nervous system."

const HERO_HIGHLIGHTED_TITLE = "Heal at the root."

const HERO_DESCRIPTION =
  "Elevate Health Solutions blends functional medicine, breathwork, and evidence-informed healing to help high-performing professionals move beyond burnout, anxiety, and depletion — into clarity, resilience, and vibrant health."

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
      "Nervous system safety first — release survival mode, reduce burnout, and teach the body it is safe to rest.",
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
      "Embody sustainable transformation — clarity, resilience, purpose, and leadership from a regulated nervous system.",
  },
]

const MEMBERSHIP_IMAGES = [
  BRAND_IMAGES.meditationSession,
  BRAND_IMAGES.heroBreathwork,
  BRAND_IMAGES.coachingVirtual,
] as const

const MEMBERSHIP_CARDS = ELEVATE_MEMBERSHIPS.map((tier, index) => ({
  category: "Membership",
  title: tier.name,
  description: tier.whoItIsFor,
  price: (
    <>
      {tier.priceLabel}{" "}
      <small className="font-body text-xs font-normal text-ink-soft">/ month</small>
    </>
  ),
  href: buildCheckoutConsentUrl({
    type: "membership",
    planSlug: tier.slug,
    interval: "monthly",
  }),
  ctaLabel: `Join ${tier.name}`,
  image: MEMBERSHIP_IMAGES[index] ?? BRAND_IMAGES.meditationSession,
}))

const TESTIMONIALS = [
  {
    quote:
      "I went from exhausted and overwhelmed to having energy and emotional stability I had not felt in years. The nervous system work changed everything.",
    cite: "Elevate Gold member · burnout recovery",
  },
  {
    quote:
      "The Reset Plan was the doorway. The membership gave me the structure to keep healing instead of starting over every few months.",
    cite: "Reset Plan graduate · ongoing membership",
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
      "Conventional care often manages symptoms. Dr. Pattani's approach identifies root causes — nervous system dysregulation, inflammation, hormones, and lifestyle — using science + soul.",
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

export default function HomePage() {
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

      <OfferCardsSection
        id="memberships"
        eyebrow="Memberships"
        title="Elevate Core, Gold & Platinum"
        cards={MEMBERSHIP_CARDS}
        footerCta={{ label: "View all programs & sessions", href: "/programs" }}
      />

      <TestimonialGrid
        eyebrow="Client experience"
        title="Calm, clarity, and lasting change"
        testimonials={TESTIMONIALS}
      />

      <FaqAccordion eyebrow="Questions, answered" title="Before you begin" items={FAQ_ITEMS} />

      <Section variant="soft" padding="default">
        <Container className="text-center">
          <h2 className="font-display text-[clamp(1.5rem,3.2vw,2.125rem)] font-medium text-ink">
            Begin with a free guided session
          </h2>
          <p className="mx-auto mt-3 max-w-[480px] text-base text-ink-soft">
            Sample Elevate breathwork before you choose a membership or program. No
            commitment required.
          </p>
          <Link
            href="/free-taster"
            className={cn(buttonVariants({ variant: "default", size: "default" }), "mt-6")}
          >
            Request free taster
          </Link>
        </Container>
      </Section>
    </main>
  )
}
