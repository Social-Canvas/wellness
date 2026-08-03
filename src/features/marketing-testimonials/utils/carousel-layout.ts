/**
 * Layout tokens for the layered short-form testimonial carousel.
 * Values are intentional bands used by the UI and asserted in tests.
 */

export const TESTIMONIAL_ACTIVE_Z = 30
export const TESTIMONIAL_SIDE_Z = 10
export const TESTIMONIAL_CONTROLS_Z = 40

/** Transition duration for transform/opacity (ms). */
export const TESTIMONIAL_LAYOUT_TRANSITION_MS = 380

/** Desktop active card width band (px). */
export const TESTIMONIAL_ACTIVE_WIDTH_DESKTOP = {
  min: 320,
  preferred: 352,
  max: 380,
} as const

/** Desktop side-card width band (px). */
export const TESTIMONIAL_SIDE_WIDTH_DESKTOP = {
  min: 280,
  preferred: 304,
  max: 330,
} as const

/** Desktop overlap band (px) — how far each side card tucks under the active card. */
export const TESTIMONIAL_OVERLAP_DESKTOP = {
  min: 60,
  preferred: 80,
  max: 90,
} as const

/** Mid viewport (≈900–1279) overlap band (px). */
export const TESTIMONIAL_OVERLAP_TABLET = {
  min: 40,
  preferred: 56,
  max: 70,
} as const

export const TESTIMONIAL_SIDE_OPACITY = {
  min: 0.45,
  preferred: 0.55,
  max: 0.65,
} as const

export const TESTIMONIAL_SIDE_SCALE = {
  min: 0.88,
  preferred: 0.92,
  max: 0.94,
} as const

/** Optional decorative blur on side posters (px). Must stay ≤ 1. */
export const TESTIMONIAL_SIDE_BLUR_PX = 0.6

export type TestimonialCarouselSlot = "previous" | "active" | "next" | "hidden"

/**
 * Maps a slide index to a visual slot relative to the fixed center.
 * Only previous / active / next are rendered in the layered stage.
 */
export function resolveTestimonialCarouselSlot(
  index: number,
  activeIndex: number,
  total: number
): TestimonialCarouselSlot {
  if (total <= 0) return "hidden"
  if (index === activeIndex) return "active"
  if (total === 1) return "hidden"

  const previous =
    ((activeIndex - 1) % total + total) % total
  const next = (activeIndex + 1) % total

  if (index === previous) return "previous"
  if (index === next) return "next"
  return "hidden"
}

/**
 * Horizontal offset (px) from stage center to a side-card center so that
 * `overlapPx` of the side card sits under the active card edge.
 *
 * previous → negative; next → positive.
 */
export function sideCardCenterOffsetPx(input: {
  activeWidthPx: number
  sideWidthPx: number
  overlapPx: number
  side: "previous" | "next"
}): number {
  const distance =
    input.activeWidthPx / 2 + input.sideWidthPx / 2 - input.overlapPx
  return input.side === "previous" ? -distance : distance
}

/** Clamp helper used by responsive overlap selection. */
export function resolveOverlapForViewport(
  viewportWidthPx: number
): number {
  if (viewportWidthPx >= 1280) {
    return TESTIMONIAL_OVERLAP_DESKTOP.preferred
  }
  if (viewportWidthPx >= 900) {
    return TESTIMONIAL_OVERLAP_TABLET.preferred
  }
  if (viewportWidthPx >= 640) {
    return TESTIMONIAL_OVERLAP_TABLET.min
  }
  // Mobile: narrow hints only; overlap still defined for layout math.
  return 28
}

export function sideCardVisualStyle(reducedMotion: boolean): {
  opacity: number
  scale: number
  filter: string | undefined
  transition: string | undefined
} {
  return {
    opacity: TESTIMONIAL_SIDE_OPACITY.preferred,
    scale: TESTIMONIAL_SIDE_SCALE.preferred,
    filter: `blur(${TESTIMONIAL_SIDE_BLUR_PX}px)`,
    transition: reducedMotion
      ? undefined
      : `transform ${TESTIMONIAL_LAYOUT_TRANSITION_MS}ms ease-out, opacity ${TESTIMONIAL_LAYOUT_TRANSITION_MS}ms ease-out, filter ${TESTIMONIAL_LAYOUT_TRANSITION_MS}ms ease-out`,
  }
}

export function activeCardVisualStyle(reducedMotion: boolean): {
  opacity: number
  scale: number
  transition: string | undefined
} {
  return {
    opacity: 1,
    scale: 1,
    transition: reducedMotion
      ? undefined
      : `transform ${TESTIMONIAL_LAYOUT_TRANSITION_MS}ms ease-out, opacity ${TESTIMONIAL_LAYOUT_TRANSITION_MS}ms ease-out`,
  }
}
