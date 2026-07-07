export const ELEVATE_BRAND = {
  name: "Elevate Health Solutions",
  shortName: "Elevate",
  founder: "Dr. Deepa Pattani",
  founderTitle:
    "Doctor of Pharmacy · Functional Medicine · Breathwork & Sound Healing",
  tagline: "Science + soul for nervous system regulation and root-cause healing.",
  philosophy: "Science + soul",
} as const

export const ELEVATE_VIDEOS = {
  founderIntro: {
    src: "/videos/dr-deepa-intro.mp4",
    title: "Meet Dr. Deepa Pattani",
    description:
      "Hear how Elevate blends functional medicine, breathwork, and nervous system regulation for lasting transformation.",
  },
  breathworkJourney: {
    src: "/videos/breathwork-journey-intro.mp4",
    title: "The Elevate breathwork journey",
    description:
      "A guided introduction to the three-year nervous system transformation framework: Ground → Release → Align → Expand.",
  },
} as const

export type MembershipSlug = "plan-1" | "plan-2" | "plan-3"

export type MembershipTierContent = {
  slug: MembershipSlug
  name: string
  priceLabel: string
  priceCents: number
  whoItIsFor: string
  featured: boolean
  features: string[]
  ctaVariant: "default" | "outline"
}

export const ELEVATE_MEMBERSHIPS: MembershipTierContent[] = [
  {
    slug: "plan-1",
    name: "Elevate Core",
    priceLabel: "$97",
    priceCents: 9700,
    whoItIsFor:
      "Simple, affordable ongoing support and an easy way to stay connected to Elevate.",
    featured: false,
    features: [
      "Monthly digital Elevate content",
      "Foundational breathwork resources",
      "Nervous system support tools",
      "Themed monthly guidance",
      "Basic member-only resources",
      "Community-style support",
    ],
    ctaVariant: "outline",
  },
  {
    slug: "plan-2",
    name: "Elevate Gold",
    priceLabel: "$197",
    priceCents: 19700,
    whoItIsFor:
      "Deeper support, more access, and a more immersive Elevate experience.",
    featured: true,
    features: [
      "Everything in Elevate Core",
      "More live access and guided support",
      "Stronger accountability",
      "Expanded implementation support",
      "Premium member resources",
    ],
    ctaVariant: "default",
  },
  {
    slug: "plan-3",
    name: "Elevate Platinum",
    priceLabel: "$333",
    priceCents: 33300,
    whoItIsFor:
      "The highest-touch experience with full access to the live Elevate model.",
    featured: false,
    features: [
      "Everything in Elevate Gold",
      "Full live Elevate experience",
      "Premium member perks",
      "VIP-style access",
      "Highest level of support",
    ],
    ctaVariant: "outline",
  },
]

export const RESET_PLAN = {
  slug: "7-day-reset",
  name: "Reset Plan",
  priceLabel: "$47",
  description:
    "Your front-door entry into Elevate — a focused reset to calm the nervous system, release hypervigilance, and begin the Ground phase of your healing journey.",
} as const

export const RESET_PLAN_CTA_FEATURES = [
  "7-day nervous system reset",
  "Guided breathwork foundations",
  "Tools to exit survival mode",
  "Your gateway into Elevate",
] as const

export const VIP_COACHING_CTA_FEATURES = [
  "Advanced diagnostics",
  "Bi-weekly 1:1 coaching",
  "Personalized healing protocol",
  "VIP retreat access",
] as const

export const RETREATS_CTA_FEATURES = [
  "Immersive breathwork retreats",
  "Sound healing experiences",
  "Private group events",
  "In-person nervous system reset",
] as const

export const ELEVATE_PROGRAM_OFFERS = [
  {
    slug: "7-day-reset",
    category: "Entry offer",
    title: "Reset Plan",
    description:
      "The first step into Elevate. A structured 7-day reset focused on nervous system safety, foundational breathwork, and practical tools to move out of survival mode.",
    ctaLabel: "Start Reset Plan",
    ctaVariant: "default" as const,
  },
  {
    slug: "autoimmune-masterclass",
    category: "Year 1 · Deep healing",
    title: "Autoimmune Masterclass",
    description:
      "Five recorded sessions within the Release phase — supporting emotional safety, stored stress in the body, and the mind-body connection behind chronic inflammation.",
    ctaLabel: "Explore masterclass",
    ctaVariant: "outline" as const,
  },
  {
    slug: "health-professional-session",
    category: "Professional",
    title: "Health Professional Session",
    description:
      "Evidence-informed functional medicine education for practitioners — bridging pharmacology, nervous system science, and integrative healing.",
    ctaLabel: "Book session",
    ctaVariant: "outline" as const,
  },
  {
    slug: "standalone-live-session",
    category: "Live experience",
    title: "Live Breathwork Session",
    description:
      "A guided live session for real-time nervous system regulation — ideal between membership tiers or as a focused reset point in your journey.",
    ctaLabel: "Reserve your spot",
    ctaVariant: "outline" as const,
  },
]

export const BREATHWORK_ROADMAP = {
  framework: "Ground → Release → Align → Expand",
  yearOneFocus: "Nervous system safety, burnout recovery, and emotional regulation",
  yearTwoFocus: "Emotional liberation, relationship healing, and identity rebirth",
  yearThreeFocus: "Purpose, expansion, and embodied leadership",
} as const

export const ELEVATE_SHOP_COPY = {
  headline: "Elevate resources",
  description:
    "Branded journals, recipe guides, and digital tools designed to support your nervous system transformation between sessions.",
  products: {
    "ebook-1": {
      title: "Clean Living Recipes",
      description:
        "A Root Cause Care recipe guide for nourishing meals that support inflammation, gut health, and sustained energy — without overwhelm.",
    },
  },
} as const
