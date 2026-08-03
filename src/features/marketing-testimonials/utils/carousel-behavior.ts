/** Default muted preview rotation interval (8–10s band). */
export const TESTIMONIAL_ROTATION_INTERVAL_MS = 9000

/** After manual next/prev/swipe, wait a full interval before auto-rotation resumes. */
export const TESTIMONIAL_MANUAL_NAV_COOLDOWN_MS = TESTIMONIAL_ROTATION_INTERVAL_MS

export type TestimonialCarouselRuntimeFlags = {
  sectionVisible: boolean
  pageVisible: boolean
  muted: boolean
  hovering: boolean
  focused: boolean
  manualNavCooldownActive: boolean
  reducedMotion: boolean
  modalOpen: boolean
}

/**
 * Auto-rotation is allowed only when the section is on-screen, the tab is
 * visible, audio is muted, the user is not interacting, and reduced motion
 * is not requested. Never advance while unmuted (audio may be playing).
 */
export function shouldAutoRotateTestimonials(
  flags: TestimonialCarouselRuntimeFlags
): boolean {
  return (
    flags.sectionVisible &&
    flags.pageVisible &&
    flags.muted &&
    !flags.hovering &&
    !flags.focused &&
    !flags.manualNavCooldownActive &&
    !flags.reducedMotion &&
    !flags.modalOpen
  )
}

/** Only the active slide may request playback; offscreen/hidden must pause. */
export function shouldPlayActiveTestimonial(input: {
  isActive: boolean
  sectionVisible: boolean
  pageVisible: boolean
  autoplayBlocked: boolean
}): boolean {
  return (
    input.isActive &&
    input.sectionVisible &&
    input.pageVisible &&
    !input.autoplayBlocked
  )
}

export function nextTestimonialIndex(
  current: number,
  total: number
): number {
  if (total <= 0) return 0
  return (current + 1) % total
}

export function previousTestimonialIndex(
  current: number,
  total: number
): number {
  if (total <= 0) return 0
  return (current - 1 + total) % total
}

/** Horizontal swipe threshold in CSS pixels. */
export const TESTIMONIAL_SWIPE_THRESHOLD_PX = 48

export function resolveSwipeDirection(
  deltaX: number,
  thresholdPx: number = TESTIMONIAL_SWIPE_THRESHOLD_PX
): "next" | "previous" | null {
  if (Math.abs(deltaX) < thresholdPx) {
    return null
  }
  // Finger moved left → next; right → previous.
  return deltaX < 0 ? "next" : "previous"
}

export function muteControlLabel(muted: boolean): string {
  return muted ? "Unmute testimonial" : "Mute testimonial"
}

export function playPauseControlLabel(playing: boolean): string {
  return playing ? "Pause testimonial" : "Play testimonial"
}

export function paginationStatusLabel(
  activeIndex: number,
  total: number,
  displayName: string
): string {
  return `Showing testimonial ${activeIndex + 1} of ${total}: ${displayName}`
}
