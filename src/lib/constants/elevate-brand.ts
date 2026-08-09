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
    priceLabel: "$47",
    priceCents: 4700,
    whoItIsFor:
      "Starter recurring membership with the full Elevate course library. In-person sessions are not included.",
    featured: false,
    features: [
      "Full membership course library",
      "Live online session access",
      "Session replays",
      "Foundational breathwork resources",
      "Nervous system support tools",
      "In-person sessions not included",
    ],
    ctaVariant: "outline",
  },
  {
    slug: "plan-2",
    name: "Elevate Gold",
    priceLabel: "$99",
    priceCents: 9900,
    whoItIsFor:
      "Mid-tier membership with the recorded session library and up to two live virtual classes per month.",
    featured: true,
    features: [
      "Recorded session library",
      "Up to 2 live virtual classes per month",
      "Session replays",
      "Stronger accountability",
    ],
    ctaVariant: "default",
  },
  {
    slug: "plan-3",
    name: "Elevate Platinum",
    priceLabel: "$149",
    priceCents: 14900,
    whoItIsFor:
      "Premium membership with everything in Gold, unlimited live virtual classes, and one included live in-person experience.",
    featured: false,
    features: [
      "Everything in Elevate Gold",
      "Access to all live virtual classes",
      "Includes one live in-person experience",
      "Priority support",
    ],
    ctaVariant: "outline",
  },
]

/** Public audience model for Programs membership tabs (unified lifecycle). */
export const MEMBERSHIP_AUDIENCES = [
  {
    id: "individuals",
    label: "Individuals",
    href: "/programs?membership=individuals#memberships",
  },
  {
    id: "nonprofit",
    label: "Nonprofit Organizations",
    href: "/programs?membership=nonprofit#memberships",
  },
] as const

export const RESET_PLAN = {
  slug: "7-day-reset",
  name: "Reset Plan",
  priceLabel: "$47",
  description:
    "A focused 7-day experience with guided breathwork and practical tools to help you reset, reconnect, and build a calmer foundation.",
} as const

export const VIP_COACHING = {
  eyebrow: "Premium 1:1",
  name: "VIP Coaching with Dr. Pattani",
  description:
    "Personalized, high-touch support built around your goals, with private coaching and an individualized approach.",
  supportingText: "Personalized program",
  ctaLabel: "Apply for VIP",
  ctaHref: "/vip",
} as const

export const RETREATS_PRIVATE_EVENTS = {
  eyebrow: "Live & in person",
  name: "Retreats & Private Events",
  description:
    "Immersive in-person experiences combining breathwork, reflection, and restorative practices for individuals and private groups.",
  supportingText: "Upcoming dates and private events",
  ctaLabel: "Explore retreats",
  ctaHref: "/retreats",
} as const

/** Retained for reference; Reset / VIP / retreats cards no longer render these. */
export const RESET_PLAN_CTA_FEATURES = [
  "7-day nervous system reset",
  "Guided breathwork foundations",
  "Tools to exit survival mode",
  "Your gateway into Elevate",
] as const

/** Retained for reference; VIP card no longer renders these. */
export const VIP_COACHING_CTA_FEATURES = [
  "Advanced diagnostics",
  "Bi-weekly 1:1 coaching",
  "Personalized healing protocol",
  "VIP retreat access",
] as const

/** Retained for reference; retreats card no longer renders these. */
export const RETREATS_CTA_FEATURES = [
  "Immersive breathwork retreats",
  "Sound healing experiences",
  "Private group events",
  "In-person nervous system reset",
] as const

export type ElevateProgramOffer = {
  slug: string
  category: string
  title: string
  description: string
  ctaLabel: string
  ctaVariant: "default" | "outline"
  /** When false, omitted from public Programs listings (record retained). */
  publiclyVisible?: boolean
}

export const ELEVATE_PROGRAM_OFFERS: ElevateProgramOffer[] = [
  {
    slug: "7-day-reset",
    category: "Entry offer",
    title: "Reset Plan",
    description:
      "The first step into Elevate. A structured 7-day reset focused on nervous system safety, foundational breathwork, and practical tools to move out of survival mode.",
    ctaLabel: "Start Reset Plan",
    ctaVariant: "default",
  },
  {
    slug: "autoimmune-masterclass",
    category: "Year 1 · Deep healing",
    title: "Autoimmune Masterclass",
    description:
      "Five recorded sessions within the Release phase, supporting emotional safety, stored stress in the body, and the mind-body connection behind chronic inflammation.",
    ctaLabel: "Explore masterclass",
    ctaVariant: "outline",
  },
  {
    slug: "health-professional-session",
    category: "Professional",
    title: "Health Professional Session",
    description:
      "Evidence-informed functional medicine education for practitioners, bridging pharmacology, nervous system science, and integrative healing.",
    ctaLabel: "Book session",
    ctaVariant: "outline",
    // Hidden from public site before Stripe live activation; DB row retained as draft.
    publiclyVisible: false,
  },
  {
    slug: "standalone-live-session",
    category: "Live experience",
    title: "Live Breathwork Session",
    description:
      "A one-time trial for one selected upcoming live session (the same Zoom session members attend). No membership, recordings, or future sessions included.",
    ctaLabel: "Reserve your spot",
    ctaVariant: "outline",
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
        "A Root Cause Care recipe guide for nourishing meals that support inflammation, gut health, and sustained energy without overwhelm.",
    },
    "elevate-integration-journal": {
      title: "The Elevate Integration Journal",
      description:
        "A guided digital journal for reflection, nervous-system awareness and integration throughout your Elevate journey.",
    },
  },
} as const
