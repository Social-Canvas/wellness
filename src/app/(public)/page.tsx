import type { Metadata } from "next"

import {
  EmailCaptureSection,
  FaqAccordion,
  FeatureGrid,
  HeroSection,
  OfferCardsSection,
  RetreatBlock,
  StepsGrid,
  TestimonialGrid,
  type HeroAction,
} from "@/components/marketing"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: "Wellness Studio — Membership Platform",
  description:
    "Transform your health with guided wellness programs, memberships, and retreats.",
}

const HERO_EYEBROW = "Wellness · Mindfulness · Retreats"

const HERO_TITLE = "Transform your health,"

const HERO_HIGHLIGHTED_TITLE = "transform your life."

const HERO_DESCRIPTION =
  "Discover the root causes of your health concerns and transform your well-being with a personalized, holistic approach. For over 20 years, our founder has helped people move from stress and fatigue back to energy, calm, and control."

const HERO_ACTIONS: HeroAction[] = [
  { label: "Browse programs", href: "/programs", variant: "primary" },
  { label: "Try a free taster", href: "/free-taster", variant: "ghost" },
]

const HERO_TRUST_ITEMS = [
  "Featured in the press",
  "Best-selling author",
  "Trusted by thousands",
]

const FEATURE_EYEBROW = "Transformations you can expect"

const FEATURE_TITLE = "What healing at the root feels like"

const FEATURE_ITEMS = [
  { title: "Improved quality of life and energy" },
  { title: "Less pain, inflammation, and brain fog" },
  { title: "Better sleep and hormonal health" },
  { title: "Better gut health, less bloating" },
  { title: "Less stress, better mental health" },
]

const STEPS = [
  {
    number: "1",
    title: "Root cause assessment",
    description:
      "Comprehensive testing and history to uncover the underlying issues behind how you feel.",
  },
  {
    number: "2",
    title: "Custom solutions",
    description:
      "Tailored guidance, programs, and coaching built around your needs and membership plan.",
  },
  {
    number: "3",
    title: "Lasting results",
    description:
      "Sustainable practices and ongoing content to maintain optimal health for the long term.",
  },
]

const OFFER_CARDS = [
  {
    category: "Program",
    title: "7-Day Reset",
    description:
      "Jumpstart your healing in a week with guided meditations, practical resources, and a clear path forward.",
    price: (
      <>
        $47 <small className="font-body text-xs font-normal text-ink-soft">one time</small>
      </>
    ),
    href: "/programs#offer-7-day-reset",
    image: BRAND_IMAGES.productJournalReset,
  },
  {
    category: "Membership",
    title: "Membership",
    description:
      "Ongoing meditation, core course library, and live session recordings across three plans.",
    price: (
      <>
        Monthly + annual{" "}
        <small className="font-body text-xs font-normal text-ink-soft">pricing TBC</small>
      </>
    ),
    href: "/programs",
    image: BRAND_IMAGES.meditationSession,
  },
  {
    category: "Premium 1:1",
    title: "VIP Package",
    description:
      "Custom high-touch transformation with enquiry-based pricing and dedicated support.",
    price: "By enquiry",
    href: "/vip",
    image: BRAND_IMAGES.wellnessSpa,
  },
]

const TESTIMONIALS = [
  {
    quote:
      "What a difference. My family member went from barely functioning to living independently. Forever grateful to the team.",
    cite: "Member A.",
  },
  {
    quote:
      "I changed my diet with their guidance and it changed my life. I always knew something was off but had never been tested.",
    cite: "Member B.",
  },
  {
    quote:
      "My nutritionist said fix the gut and things fall into place. This program finally showed me how to actually do it.",
    cite: "Member C.",
  },
]

const FAQ_ITEMS = [
  {
    question: "Do you take insurance?",
    answer:
      "Memberships and programs are self-pay, and costs are always shared up front.",
  },
  {
    question: "How is this different from conventional medicine?",
    answer:
      "Conventional care manages symptoms. Our approach looks for the root cause using history, testing, and lifestyle as the levers for lasting change.",
  },
  {
    question: "How long until I feel a difference?",
    answer:
      "Many clients notice shifts in energy and sleep within the first few weeks. Deeper change builds over the course of your protocol.",
  },
  {
    question: "Are consultations virtual?",
    answer:
      "Yes, sessions are delivered virtually so you can take part wherever you are. In-person retreats are also available.",
  },
  {
    question: "Is this safe with my medications?",
    answer:
      "Our team takes safety seriously and works alongside your existing care. Always keep your physician informed.",
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
      />

      <FeatureGrid
        eyebrow={FEATURE_EYEBROW}
        title={FEATURE_TITLE}
        items={FEATURE_ITEMS}
      />

      <StepsGrid eyebrow="Our approach" title="How we get you back to yourself" steps={STEPS} />

      <OfferCardsSection
        eyebrow="Ways to work together"
        title="From a quick reset to the full experience"
        cards={OFFER_CARDS}
        footerCta={{ label: "See all programs & plans", href: "/programs" }}
      />

      <TestimonialGrid
        eyebrow="What clients say"
        title="Real people, real shifts"
        testimonials={TESTIMONIALS}
      />

      <RetreatBlock
        eyebrow="Live events & retreats"
        title="Retreats and private events around the world"
        description="Step away from the noise and reconnect — breathwork, sound baths, and deep rest in beautiful destinations. Enquire for upcoming dates and formats."
        cta={{ label: "Explore retreats", href: "/retreats" }}
      />

      <FaqAccordion eyebrow="Questions, answered" title="Before you begin" items={FAQ_ITEMS} />

      <EmailCaptureSection
        title="Get 10% off your first program"
        description="Drop your email and we'll send your code plus a free guided session to begin."
      />
    </main>
  )
}
