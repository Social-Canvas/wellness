import type { Metadata } from "next"

import { Navbar, Ticker } from "@/components/layout"
import {
  CtaBand,
  FeatureGrid,
  HeroSection,
  type HeroAction,
} from "@/components/marketing"

export const metadata: Metadata = {
  title: "Wellness Studio — Membership Platform",
  description:
    "Transform your health with guided wellness programs, memberships, and retreats.",
}

const TICKER_MESSAGE =
  "Educational content only · not medical advice · Get 10% off your first program with code WELCOME10"

const NAV_LINKS = [
  { label: "Home", href: "/", active: true },
  { label: "Programs", href: "/programs" },
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
  { label: "Get started", href: "/programs", variant: "primary" as const },
]

const HERO_EYEBROW = "Wellness · Mindfulness · Retreats"

const HERO_TITLE = "Transform your health,"

const HERO_HIGHLIGHTED_TITLE = "transform your life."

const HERO_DESCRIPTION =
  "Discover the root causes of your health concerns and transform your well-being with a personalized, holistic approach. For over 20 years, our founder has helped people move from stress and fatigue back to energy, calm, and control."

const HERO_ACTIONS: HeroAction[] = [
  { label: "Browse programs", href: "/programs", variant: "primary" },
  {
    label: "Book a $75 consult",
    href: "/programs#discovery-consultation",
    variant: "ghost",
  },
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

const CTA_BAND_EYEBROW = "Premium 1:1"

const CTA_BAND_TITLE = "VIP Package — Full Transformation"

const CTA_BAND_DESCRIPTION =
  "The most comprehensive, high-touch transformation, done with you, one to one."

const CTA_BAND_FEATURES = [
  "Comprehensive holistic wellness testing",
  "1:1 bi-weekly coaching calls",
  "All supplements included",
  "6-month Membership access",
  "Exclusive VIP retreat access",
  "Private VIP support community",
]

const CTA_BAND_PRICE = "$3,500 to $15,000"

const CTA_BAND_PRICE_NOTE = "based on customization"

const CTA_BAND_ACTION = {
  label: "Apply for VIP",
  href: "/vip",
}

export default function HomePage() {
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

        <CtaBand
          eyebrow={CTA_BAND_EYEBROW}
          title={CTA_BAND_TITLE}
          description={CTA_BAND_DESCRIPTION}
          features={CTA_BAND_FEATURES}
          price={CTA_BAND_PRICE}
          priceNote={CTA_BAND_PRICE_NOTE}
          action={CTA_BAND_ACTION}
        />
      </main>
    </>
  )
}
