import assert from "node:assert/strict"
import { homedir } from "node:os"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import {
  HOMEPAGE_TESTIMONIAL_SOURCE_COUNT,
  HOMEPAGE_VIDEO_TESTIMONIALS,
  VIDEO_TESTIMONIALS_SECTION,
} from "../data/testimonials.ts"
import {
  muteControlLabel,
  nextTestimonialIndex,
  paginationStatusLabel,
  playPauseControlLabel,
  previousTestimonialIndex,
  resolveSwipeDirection,
  shouldAutoRotateTestimonials,
  shouldPlayActiveTestimonial,
  TESTIMONIAL_ROTATION_INTERVAL_MS,
} from "../utils/carousel-behavior.ts"
import {
  TESTIMONIAL_ACTIVE_WIDTH_DESKTOP,
  TESTIMONIAL_ACTIVE_Z,
  TESTIMONIAL_LAYOUT_TRANSITION_MS,
  TESTIMONIAL_OVERLAP_DESKTOP,
  TESTIMONIAL_OVERLAP_TABLET,
  TESTIMONIAL_SIDE_BLUR_PX,
  TESTIMONIAL_SIDE_OPACITY,
  TESTIMONIAL_SIDE_SCALE,
  TESTIMONIAL_SIDE_WIDTH_DESKTOP,
  TESTIMONIAL_SIDE_Z,
  resolveOverlapForViewport,
  resolveTestimonialCarouselSlot,
  sideCardCenterOffsetPx,
  sideCardVisualStyle,
} from "../utils/carousel-layout.ts"
import { inventoryTestimonialSources } from "../utils/media-inventory.ts"
import {
  buildMuxPosterUrl,
  containsForbiddenMediaLeak,
  getCarouselTestimonials,
  getPublishedTestimonials,
  resolveTestimonialDisplayName,
  resolveTestimonialPoster,
} from "../utils/testimonials.ts"
import type { HomepageVideoTestimonial } from "../types.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

const publishedFixture: HomepageVideoTestimonial[] = Array.from(
  { length: 6 },
  (_, index) => ({
    id: `member-story-${index + 1}`,
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: `playback_${index + 1}`,
    posterUrl: `https://image.mux.com/playback_${index + 1}/thumbnail.jpg`,
    captionsUrl: index === 0 ? "https://cdn.example.com/captions-1.vtt" : null,
    sortOrder: index + 1,
    publicationStatus: "published",
    accessibleLabel: `Member story ${index + 1}, portrait video testimonial`,
  })
)

// 1. Six published testimonials render
test("1. Six published testimonials render", () => {
  const items = getPublishedTestimonials(publishedFixture)
  assert.equal(items.length, 6)
  assert.equal(HOMEPAGE_VIDEO_TESTIMONIALS.length, 6)
  assert.equal(getCarouselTestimonials(publishedFixture).length, 6)
})

// 2. Only active testimonial plays
test("2. Only active testimonial plays", () => {
  assert.equal(
    shouldPlayActiveTestimonial({
      isActive: true,
      sectionVisible: true,
      pageVisible: true,
      autoplayBlocked: false,
    }),
    true
  )
  assert.equal(
    shouldPlayActiveTestimonial({
      isActive: false,
      sectionVisible: true,
      pageVisible: true,
      autoplayBlocked: false,
    }),
    false
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /isActive && item\.muxPlaybackId/)
})

// 3. Inactive testimonials remain paused
test("3. Inactive testimonials remain paused", () => {
  assert.equal(
    shouldPlayActiveTestimonial({
      isActive: false,
      sectionVisible: true,
      pageVisible: true,
      autoplayBlocked: false,
    }),
    false
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /el\.pause\?/)
  assert.match(carousel, /isActive && item\.muxPlaybackId/)
  assert.equal((carousel.match(/<MuxPlayer/g) ?? []).length, 1)
})

// 4. Active video begins muted
test("4. Active video begins muted", () => {
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /useState\(true\)/)
  assert.match(carousel, /muted=\{muted\}/)
  assert.match(carousel, /loop=\{muted\}/)
})

// 5. Unmute requires user interaction
test("5. Unmute requires user interaction", () => {
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /toggleMute/)
  assert.match(carousel, /aria-label=\{muteControlLabel\(muted\)\}/)
  assert.equal(muteControlLabel(true), "Unmute testimonial")
})

// 6. Unmuting pauses auto-rotation
test("6. Unmuting pauses auto-rotation", () => {
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: true,
      pageVisible: true,
      muted: false,
      hovering: false,
      focused: false,
      manualNavCooldownActive: false,
      reducedMotion: false,
      modalOpen: false,
    }),
    false
  )
})

// 7. Muting may resume rotation
test("7. Muting may resume rotation", () => {
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: true,
      pageVisible: true,
      muted: true,
      hovering: false,
      focused: false,
      manualNavCooldownActive: false,
      reducedMotion: false,
      modalOpen: false,
    }),
    true
  )
})

// 8. Previous video pauses when slide changes
test("8. Previous video pauses when slide changes", () => {
  assert.equal(nextTestimonialIndex(0, 6), 1)
  assert.equal(previousTestimonialIndex(0, 6), 5)
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /setActiveIndex\(next\)/)
  assert.match(carousel, /setPlaying\(false\)/)
})

// 9. Autoplay rejection shows a play fallback
test("9. Autoplay rejection shows a play fallback", () => {
  assert.equal(
    shouldPlayActiveTestimonial({
      isActive: true,
      sectionVisible: true,
      pageVisible: true,
      autoplayBlocked: true,
    }),
    false
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /setAutoplayBlocked\(true\)/)
  assert.match(carousel, /Play testimonial/)
  assert.equal(playPauseControlLabel(false), "Play testimonial")
})

// 10. Manual next and previous navigation works
test("10. Manual next and previous navigation works", () => {
  assert.equal(nextTestimonialIndex(5, 6), 0)
  assert.equal(previousTestimonialIndex(1, 6), 0)
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /aria-label="Previous testimonial"/)
  assert.match(carousel, /aria-label="Next testimonial"/)
})

// 11. Swipe navigation works on mobile
test("11. Swipe navigation works on mobile", () => {
  assert.equal(resolveSwipeDirection(-80), "next")
  assert.equal(resolveSwipeDirection(80), "previous")
  assert.equal(resolveSwipeDirection(10), null)
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /onPointerDown/)
  assert.match(carousel, /resolveSwipeDirection/)
})

// 12. Rotation stops on hover/focus
test("12. Rotation stops on hover/focus", () => {
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: true,
      pageVisible: true,
      muted: true,
      hovering: true,
      focused: false,
      manualNavCooldownActive: false,
      reducedMotion: false,
      modalOpen: false,
    }),
    false
  )
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: true,
      pageVisible: true,
      muted: true,
      hovering: false,
      focused: true,
      manualNavCooldownActive: false,
      reducedMotion: false,
      modalOpen: false,
    }),
    false
  )
})

// 13. Rotation stops for reduced motion
test("13. Rotation stops for reduced motion", () => {
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: true,
      pageVisible: true,
      muted: true,
      hovering: false,
      focused: false,
      manualNavCooldownActive: false,
      reducedMotion: true,
      modalOpen: false,
    }),
    false
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /prefers-reduced-motion:\s*reduce/)
})

// 14. Rotation stops when page is hidden
test("14. Rotation stops when page is hidden", () => {
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: true,
      pageVisible: false,
      muted: true,
      hovering: false,
      focused: false,
      manualNavCooldownActive: false,
      reducedMotion: false,
      modalOpen: false,
    }),
    false
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /visibilitychange/)
  assert.match(carousel, /document\.visibilityState/)
})

// 15. Playback pauses when carousel leaves viewport
test("15. Playback pauses when carousel leaves viewport", () => {
  assert.equal(
    shouldPlayActiveTestimonial({
      isActive: true,
      sectionVisible: false,
      pageVisible: true,
      autoplayBlocked: false,
    }),
    false
  )
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: false,
      pageVisible: true,
      muted: true,
      hovering: false,
      focused: false,
      manualNavCooldownActive: false,
      reducedMotion: false,
      modalOpen: false,
    }),
    false
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /IntersectionObserver/)
})

// 16. Inactive slides use poster images
test("16. Inactive slides use poster images", () => {
  const poster = resolveTestimonialPoster(publishedFixture[1]!)
  assert.ok(poster?.includes("image.mux.com"))
  assert.ok(buildMuxPosterUrl("abc123")?.includes("/thumbnail.jpg"))
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /resolveTestimonialPoster/)
  assert.match(carousel, /loading=\{isActive \? "eager" : "lazy"\}/)
})

// 17. Exactly six MP4 files are selected for upload
test("17. Exactly six MP4 files are selected for upload", () => {
  assert.equal(HOMEPAGE_TESTIMONIAL_SOURCE_COUNT, 6)
  const directory = join(homedir(), "Downloads", "testimonials")
  const inventory = inventoryTestimonialSources(directory)
  assert.equal(inventory.files.length, 6)
  assert.equal(inventory.ok, true, inventory.errors.join("; "))
  const script = read("scripts/upload-homepage-testimonials.mjs")
  assert.match(script, /EXPECTED_COUNT = 6/)
  assert.match(script, /playback_policy:\s*\[\s*"public"\s*\]/)
})

// 18. Source filenames are not visible publicly
test("18. Source filenames are not visible publicly", () => {
  const data = read(
    "src/features/marketing-testimonials/data/testimonials.ts"
  )
  const page = read("src/app/(public)/page.tsx")
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  for (const source of [data, page, carousel]) {
    assert.equal(containsForbiddenMediaLeak(source), false)
  }
  for (const item of HOMEPAGE_VIDEO_TESTIMONIALS) {
    assert.equal(containsForbiddenMediaLeak(item.id), false)
    assert.equal(containsForbiddenMediaLeak(item.accessibleLabel), false)
    assert.equal(
      containsForbiddenMediaLeak(resolveTestimonialDisplayName(item)),
      false
    )
  }
})

// 19. Captions are supported
test("19. Captions are supported", () => {
  assert.ok("captionsUrl" in HOMEPAGE_VIDEO_TESTIMONIALS[0]!)
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /kind="captions"/)
  assert.match(carousel, /item\.captionsUrl/)
  assert.equal(publishedFixture[0]!.captionsUrl?.endsWith(".vtt"), true)
})

// 20. Keyboard and screen-reader labels work
test("20. Keyboard and screen-reader labels work", () => {
  assert.equal(muteControlLabel(false), "Mute testimonial")
  assert.equal(
    paginationStatusLabel(0, 6, "Member story"),
    "Showing testimonial 1 of 6: Member story"
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /aria-live="polite"/)
  assert.match(carousel, /aria-label="Previous testimonial"/)
  assert.match(carousel, /aria-label="Next testimonial"/)
  assert.match(carousel, /focus-visible:outline/)
})

// 21. Mobile layout does not overflow
test("21. Mobile layout does not overflow", () => {
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /overflow-x-clip/)
  assert.match(carousel, /aspect-\[9\/16\]/)
  assert.match(carousel, /w-\[min\(100%,20rem\)\]/)
  assert.match(carousel, /max-w-5xl/)
  assert.match(carousel, /hidden sm:block/)
})

// 22. Homepage remains performant
test("22. Homepage remains performant", () => {
  assert.ok(TESTIMONIAL_ROTATION_INTERVAL_MS >= 8000)
  assert.ok(TESTIMONIAL_ROTATION_INTERVAL_MS <= 10000)
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /preload="metadata"/)
  assert.match(carousel, /isActive && item\.muxPlaybackId/)
  const page = read("src/app/(public)/page.tsx")
  assert.match(page, /VideoTestimonialsSection/)
  assert.doesNotMatch(page, /"use client"/)
})

// 23. No membership, Stripe, database-auth or email behavior changes
test("23. No membership, Stripe, database-auth or email behavior changes", () => {
  const diffTargets = [
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx",
    "src/features/marketing-testimonials/components/video-testimonials-section.tsx",
    "src/features/marketing-testimonials/data/testimonials.ts",
    "src/features/marketing-testimonials/utils/carousel-behavior.ts",
    "src/features/marketing-testimonials/utils/carousel-layout.ts",
    "src/app/(public)/page.tsx",
    "scripts/upload-homepage-testimonials.mjs",
  ]
  for (const path of diffTargets) {
    const source = read(path)
    assert.doesNotMatch(source, /createCheckoutSession/)
    assert.doesNotMatch(source, /STRIPE_SECRET/)
    assert.doesNotMatch(source, /membership_lifecycle/)
    assert.doesNotMatch(source, /recorded_sessions/)
    assert.doesNotMatch(source, /signInWithPassword/)
    assert.doesNotMatch(source, /RESEND_API_KEY/)
  }

  assert.equal(VIDEO_TESTIMONIALS_SECTION.eyebrow, "MEMBER STORIES")
  assert.equal(
    VIDEO_TESTIMONIALS_SECTION.title,
    "Real experiences. Meaningful change."
  )
})

// --- Layout overlap / centering (user section 10) ---

test("24. Active testimonial remains visually centered", () => {
  assert.equal(resolveTestimonialCarouselSlot(2, 2, 6), "active")
  assert.equal(resolveTestimonialCarouselSlot(1, 2, 6), "previous")
  assert.equal(resolveTestimonialCarouselSlot(3, 2, 6), "next")
  assert.equal(resolveTestimonialCarouselSlot(0, 2, 6), "hidden")
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /testimonial-card-active/)
  assert.match(carousel, /justify-center/)
  assert.match(carousel, /left-\[calc\(50%/)
  assert.doesNotMatch(carousel, /grid-cols-3/)
})

test("25. Previous and next cards overlap the active card", () => {
  assert.ok(TESTIMONIAL_OVERLAP_DESKTOP.preferred >= 60)
  assert.ok(TESTIMONIAL_OVERLAP_DESKTOP.preferred <= 90)
  assert.ok(TESTIMONIAL_OVERLAP_TABLET.preferred >= 40)
  assert.ok(TESTIMONIAL_OVERLAP_TABLET.preferred <= 70)
  assert.ok(TESTIMONIAL_ACTIVE_WIDTH_DESKTOP.preferred >= 320)
  assert.ok(TESTIMONIAL_ACTIVE_WIDTH_DESKTOP.preferred <= 380)
  assert.ok(TESTIMONIAL_SIDE_WIDTH_DESKTOP.preferred >= 280)
  assert.ok(TESTIMONIAL_SIDE_WIDTH_DESKTOP.preferred <= 330)

  const offset = sideCardCenterOffsetPx({
    activeWidthPx: TESTIMONIAL_ACTIVE_WIDTH_DESKTOP.preferred,
    sideWidthPx: TESTIMONIAL_SIDE_WIDTH_DESKTOP.preferred,
    overlapPx: TESTIMONIAL_OVERLAP_DESKTOP.preferred,
    side: "previous",
  })
  assert.ok(offset < 0)
  // Side card center must sit inside the active half + side half span.
  assert.ok(
    Math.abs(offset) <
      TESTIMONIAL_ACTIVE_WIDTH_DESKTOP.preferred / 2 +
        TESTIMONIAL_SIDE_WIDTH_DESKTOP.preferred / 2
  )

  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /testimonial-card-previous/)
  assert.match(carousel, /testimonial-card-next/)
  assert.match(carousel, /left-\[calc\(50%-/)
  assert.match(carousel, /left-\[calc\(50%\+/)
})

test("26. Active card has the highest stacking order", () => {
  assert.ok(TESTIMONIAL_ACTIVE_Z > TESTIMONIAL_SIDE_Z)
  assert.equal(TESTIMONIAL_ACTIVE_Z, 30)
  assert.equal(TESTIMONIAL_SIDE_Z, 10)
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /TESTIMONIAL_ACTIVE_Z/)
  assert.match(carousel, /TESTIMONIAL_SIDE_Z/)
  assert.match(carousel, /TESTIMONIAL_CONTROLS_Z/)
})

test("27. Inactive cards remain paused (layout)", () => {
  assert.equal(
    shouldPlayActiveTestimonial({
      isActive: false,
      sectionVisible: true,
      pageVisible: true,
      autoplayBlocked: false,
    }),
    false
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.equal((carousel.match(/<MuxPlayer/g) ?? []).length, 1)
  assert.match(carousel, /isActive && item\.muxPlaybackId/)
})

test("28. Side cards use poster imagery", () => {
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /resolveTestimonialPoster/)
  assert.match(carousel, /loading=\{isActive \? "eager" : "lazy"\}/)
  // Side slots never mount MuxPlayer — only the active branch does.
  assert.match(carousel, /isActive && item\.muxPlaybackId/)
})

test("29. Active video controls remain clickable", () => {
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /TESTIMONIAL_CONTROLS_Z/)
  assert.match(carousel, /pointer-events-auto/)
  assert.match(carousel, /toggleMute/)
  assert.match(carousel, /togglePlayPause/)
})

test("30. Clicking a side preview selects it", () => {
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /isSide[\s\S]*goTo\(index,\s*\{\s*manual:\s*true/)
  assert.match(carousel, /Show testimonial \$\{index \+ 1\}/)
  assert.match(carousel, /tabIndex=\{-1\}/)
})

test("31. Carousel transition preserves the center position", () => {
  assert.ok(TESTIMONIAL_LAYOUT_TRANSITION_MS >= 300)
  assert.ok(TESTIMONIAL_LAYOUT_TRANSITION_MS <= 450)
  // Slot mapping stays centered on activeIndex regardless of which index is active.
  for (let active = 0; active < 6; active += 1) {
    assert.equal(resolveTestimonialCarouselSlot(active, active, 6), "active")
  }
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /TESTIMONIAL_LAYOUT_TRANSITION_MS/)
  assert.match(carousel, /justify-center/)
})

test("32. Mobile does not overflow horizontally (layout tokens)", () => {
  assert.equal(resolveOverlapForViewport(375), 28)
  assert.equal(resolveOverlapForViewport(768), 40)
  assert.equal(resolveOverlapForViewport(1024), TESTIMONIAL_OVERLAP_TABLET.preferred)
  assert.equal(resolveOverlapForViewport(1280), TESTIMONIAL_OVERLAP_DESKTOP.preferred)
  assert.equal(resolveOverlapForViewport(1440), TESTIMONIAL_OVERLAP_DESKTOP.preferred)
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /overflow-x-clip/)
  assert.match(carousel, /Section[\s\S]*overflow-x-clip/)
})

test("33. Reduced-motion disables or simplifies animated transitions", () => {
  const animated = sideCardVisualStyle(false)
  const reduced = sideCardVisualStyle(true)
  assert.ok(animated.transition)
  assert.equal(reduced.transition, undefined)
  assert.ok(TESTIMONIAL_SIDE_BLUR_PX <= 1)
  assert.ok(TESTIMONIAL_SIDE_OPACITY.preferred >= 0.45)
  assert.ok(TESTIMONIAL_SIDE_OPACITY.preferred <= 0.65)
  assert.ok(TESTIMONIAL_SIDE_SCALE.preferred >= 0.88)
  assert.ok(TESTIMONIAL_SIDE_SCALE.preferred <= 0.94)
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /prefers-reduced-motion:\s*reduce/)
  assert.match(carousel, /reducedMotion/)
})

test("34. Pagination remains centered beneath the active card", () => {
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /data-testid="testimonial-carousel-pagination"/)
  assert.match(
    carousel,
    /testimonial-carousel-pagination[\s\S]*justify-center/
  )
  assert.match(carousel, /aria-label="Testimonial slides"/)
})

test("35. Existing autoplay and mute behavior remains unchanged", () => {
  assert.ok(TESTIMONIAL_ROTATION_INTERVAL_MS >= 8000)
  assert.ok(TESTIMONIAL_ROTATION_INTERVAL_MS <= 10000)
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: true,
      pageVisible: true,
      muted: true,
      hovering: false,
      focused: false,
      manualNavCooldownActive: false,
      reducedMotion: false,
      modalOpen: false,
    }),
    true
  )
  assert.equal(
    shouldAutoRotateTestimonials({
      sectionVisible: true,
      pageVisible: true,
      muted: false,
      hovering: false,
      focused: false,
      manualNavCooldownActive: false,
      reducedMotion: false,
      modalOpen: false,
    }),
    false
  )
  const carousel = read(
    "src/features/marketing-testimonials/components/video-testimonials-carousel.tsx"
  )
  assert.match(carousel, /useState\(true\)/)
  assert.match(carousel, /muted=\{muted\}/)
  assert.match(carousel, /loop=\{muted\}/)
  assert.match(carousel, /TESTIMONIAL_ROTATION_INTERVAL_MS/)
})
