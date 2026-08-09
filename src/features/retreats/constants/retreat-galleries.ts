import type { BrandImageAsset } from "@/lib/brand/images"

/**
 * Authentic past-retreat gallery stills from client-provided photos.
 * Videos were inspected and omitted from still carousels.
 */
export const SEDONA_RETREAT_GALLERY = [
  {
    src: "/brand/retreats/sedona/cathedral-rock.jpg",
    alt: "Sedona red rock formations under a clear blue sky",
    objectPosition: "center 40%",
  },
  {
    src: "/brand/retreats/sedona/tree-pose-red-rocks.jpg",
    alt: "Woman in a purple jacket practicing a standing yoga pose on Sedona red rocks",
    objectPosition: "center 30%",
  },
  {
    src: "/brand/retreats/sedona/arms-open-red-rocks.jpg",
    alt: "Woman in a purple jacket standing with arms open before Sedona red rock cliffs",
    objectPosition: "center 35%",
  },
  {
    src: "/brand/retreats/sedona/buddha-red-rocks.jpg",
    alt: "Woman standing beside a Buddha statue with Sedona red rocks behind",
    objectPosition: "center 35%",
  },
  {
    src: "/brand/retreats/sedona/rock-heart-spiral.jpg",
    alt: "Heart-shaped spiral arranged from red rocks on desert ground in Sedona",
    objectPosition: "center center",
  },
] as const satisfies readonly BrandImageAsset[]

export const BALI_RETREAT_GALLERY = [
  {
    src: "/brand/retreats/bali/meditation-lotus-waterfall.jpg",
    alt: "Woman seated in meditation on a stone lotus pedestal before a tropical waterfall",
    objectPosition: "center 30%",
  },
  {
    src: "/brand/retreats/bali/tree-pose-waterfall.jpg",
    alt: "Woman in a green dress practicing a standing yoga pose before a tropical waterfall",
    objectPosition: "center 28%",
  },
  {
    src: "/brand/retreats/bali/canang-sari-offerings.jpg",
    alt: "Woman in a green wrap placing flower offerings at a Balinese temple",
    objectPosition: "center 35%",
  },
  {
    src: "/brand/retreats/bali/taman-beji-griya-entrance.jpg",
    alt: "Woman holding flower offerings at the Taman Beji Griya Waterfall entrance in Badung, Bali",
    objectPosition: "center 35%",
  },
  {
    src: "/brand/retreats/bali/waterfall-blessing.jpg",
    alt: "Woman receiving a traditional water blessing near tropical waterfalls in Bali",
    objectPosition: "center 30%",
  },
  {
    src: "/brand/retreats/bali/cave-water-ritual.jpg",
    alt: "Woman at a sacred water spout with Balinese flower offerings in a cave shrine",
    objectPosition: "center 40%",
  },
  {
    src: "/brand/retreats/bali/pavilion-blessing.jpg",
    alt: "Woman in a traditional sarong seated with a Balinese elder in a carved wooden pavilion",
    objectPosition: "center 35%",
  },
] as const satisfies readonly BrandImageAsset[]

export const RETREAT_GALLERIES = {
  sedona: SEDONA_RETREAT_GALLERY,
  bali: BALI_RETREAT_GALLERY,
} as const

export type RetreatGalleryKey = keyof typeof RETREAT_GALLERIES
