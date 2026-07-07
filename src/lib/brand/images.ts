export type BrandImageAsset = {
  src: string
  alt: string
  objectPosition?: string
}

export const BRAND_IMAGES = {
  founderPortrait: {
    src: "/brand/founder-portrait.png",
    alt: "Dr. Deepa Pattani, founder of Elevate Health Solutions, in a serene outdoor setting",
    objectPosition: "center 20%",
  },
  heroBreathwork: {
    src: "/brand/hero-breathwork.png",
    alt: "Woman practicing mindful breathwork in a calm, sunlit wellness space",
    objectPosition: "center center",
  },
  meditationSession: {
    src: "/brand/meditation-session.png",
    alt: "Woman meditating in lotus pose on a sage green yoga mat",
    objectPosition: "center center",
  },
  meditationHands: {
    src: "/brand/meditation-hands.png",
    alt: "Close-up of hands in a peaceful meditation posture",
    objectPosition: "center center",
  },
  coachingConsultation: {
    src: "/brand/coaching-consultation.png",
    alt: "One-to-one wellness coaching consultation in a calm, premium setting",
    objectPosition: "center center",
  },
  coachingGroup: {
    src: "/brand/coaching-group.png",
    alt: "Group wellness coaching session with in-person and virtual participants",
    objectPosition: "center center",
  },
  coachingVirtual: {
    src: "/brand/coaching-virtual.png",
    alt: "Virtual group meditation and coaching session",
    objectPosition: "center center",
  },
  retreatRiver: {
    src: "/brand/retreat-river.png",
    alt: "Group meditation at sunrise beside a tranquil river during a wellness retreat",
    objectPosition: "center center",
  },
  retreatSpiritual: {
    src: "/brand/retreat-spiritual.png",
    alt: "Spiritual purification ritual with flowing water in a lush natural setting",
    objectPosition: "center 30%",
  },
  nutritionIngredients: {
    src: "/brand/nutrition-ingredients.png",
    alt: "Fresh whole-food ingredients arranged for clean, nourishing meals",
    objectPosition: "center center",
  },
  productCookbook: {
    src: "/brand/product-cookbook.png",
    alt: "Clean Living Recipes cookbook surrounded by fresh ingredients",
    objectPosition: "center center",
  },
  productJournalReset: {
    src: "/brand/product-journal-reset.png",
    alt: "7-Day Reset journal and glass water bottle on a linen surface",
    objectPosition: "center center",
  },
  lifestyleJournal: {
    src: "/brand/lifestyle-journal.png",
    alt: "Open wellness journal with tea and candle on a sunlit desk",
    objectPosition: "center center",
  },
  blogWorkspace: {
    src: "/brand/blog-workspace.png",
    alt: "Calm workspace with laptop, herbal tea, and wellness blog planning",
    objectPosition: "center center",
  },
  wellnessSpa: {
    src: "/brand/wellness-spa.png",
    alt: "Luxury wellness treatment room with soft lighting and natural materials",
    objectPosition: "center center",
  },
  certificate: {
    src: "/brand/certificate.png",
    alt: "Elevate Health Solutions certificate of completion",
    objectPosition: "center center",
  },
} as const satisfies Record<string, BrandImageAsset>

export type BrandImageKey = keyof typeof BRAND_IMAGES

const PROGRAM_OFFER_IMAGES: Record<string, BrandImageKey> = {
  "7-day-reset": "productJournalReset",
  "autoimmune-masterclass": "coachingVirtual",
  "health-professional-session": "coachingConsultation",
  "standalone-live-session": "coachingGroup",
}

const SHOP_PRODUCT_IMAGES: Record<string, BrandImageKey> = {
  "ebook-1": "productCookbook",
}

const BLOG_ARTICLE_IMAGES: Record<string, BrandImageKey> = {
  fatigue: "blogWorkspace",
  gutmind: "nutritionIngredients",
  cortisol: "heroBreathwork",
}

export function getBrandImage(key: BrandImageKey): BrandImageAsset {
  return BRAND_IMAGES[key]
}

export function getProgramOfferBrandImage(slug: string): BrandImageAsset {
  const imageKey = PROGRAM_OFFER_IMAGES[slug] ?? "meditationSession"
  return BRAND_IMAGES[imageKey]
}

export function getShopProductBrandImage(slug: string): BrandImageAsset {
  const imageKey = SHOP_PRODUCT_IMAGES[slug]
  return imageKey ? BRAND_IMAGES[imageKey] : BRAND_IMAGES.lifestyleJournal
}

export function getBlogArticleBrandImage(slug: string): BrandImageAsset {
  const imageKey = BLOG_ARTICLE_IMAGES[slug] ?? "lifestyleJournal"
  return BRAND_IMAGES[imageKey]
}

export function resolveProductCoverImage(
  slug: string,
  coverImageUrl: string | null | undefined
): BrandImageAsset | { src: string; alt: string; objectPosition?: string } {
  if (coverImageUrl) {
    return { src: coverImageUrl, alt: "" }
  }

  return getShopProductBrandImage(slug) ?? getProgramOfferBrandImage(slug)
}
