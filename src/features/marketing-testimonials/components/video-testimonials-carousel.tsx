"use client"

import MuxPlayer from "@mux/mux-player-react"
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"
import { resolvePosterUrl } from "@/features/content/utils/poster-url"
import { cn } from "@/lib/utils"

import { VIDEO_TESTIMONIALS_SECTION } from "../data/testimonials"
import type { HomepageVideoTestimonial } from "../types"
import {
  muteControlLabel,
  nextTestimonialIndex,
  paginationStatusLabel,
  playPauseControlLabel,
  previousTestimonialIndex,
  resolveSwipeDirection,
  shouldAutoRotateTestimonials,
  shouldPlayActiveTestimonial,
  TESTIMONIAL_MANUAL_NAV_COOLDOWN_MS,
  TESTIMONIAL_ROTATION_INTERVAL_MS,
} from "../utils/carousel-behavior"
import {
  TESTIMONIAL_ACTIVE_Z,
  TESTIMONIAL_CONTROLS_Z,
  TESTIMONIAL_LAYOUT_TRANSITION_MS,
  TESTIMONIAL_SIDE_BLUR_PX,
  TESTIMONIAL_SIDE_OPACITY,
  TESTIMONIAL_SIDE_Z,
  resolveTestimonialCarouselSlot,
  resolveTestimonialNavDirection,
  testimonialSlotTransform,
  type TestimonialCarouselSlot,
  type TestimonialNavDirection,
} from "../utils/carousel-layout"
import {
  buildSlideAccessibleName,
  resolveTestimonialDisplayName,
  resolveTestimonialPoster,
  resolveTestimonialRoleContext,
} from "../utils/testimonials"

type VideoTestimonialsCarouselProps = {
  testimonials: HomepageVideoTestimonial[]
  className?: string
}

type MuxMediaElement = HTMLElement & {
  play?: () => Promise<void>
  pause?: () => void
}

function slotVisualStyle(
  slot: TestimonialCarouselSlot,
  reducedMotion: boolean
): CSSProperties | undefined {
  if (slot === "hidden") return undefined

  const transition = reducedMotion
    ? undefined
    : `transform ${TESTIMONIAL_LAYOUT_TRANSITION_MS}ms ease-out, opacity ${TESTIMONIAL_LAYOUT_TRANSITION_MS}ms ease-out, filter ${TESTIMONIAL_LAYOUT_TRANSITION_MS}ms ease-out`

  if (slot === "active") {
    return {
      zIndex: TESTIMONIAL_ACTIVE_Z,
      opacity: 1,
      transform: testimonialSlotTransform("active"),
      transition,
    }
  }

  return {
    zIndex: TESTIMONIAL_SIDE_Z,
    opacity: TESTIMONIAL_SIDE_OPACITY.preferred,
    transform: testimonialSlotTransform(slot),
    filter: `blur(${TESTIMONIAL_SIDE_BLUR_PX}px)`,
    transition,
  }
}

/** Responsive horizontal offset from stage center (rem). Previous is negative. */
function slotOffsetClass(slot: Exclude<TestimonialCarouselSlot, "hidden">): string {
  if (slot === "active") return "[--slot-x:0rem]"
  if (slot === "previous") {
    return "[--slot-x:-14.75rem] md:[--slot-x:-15.25rem] lg:[--slot-x:-14.75rem]"
  }
  return "[--slot-x:14.75rem] md:[--slot-x:15.25rem] lg:[--slot-x:14.75rem]"
}

export function VideoTestimonialsCarousel({
  testimonials,
  className,
}: VideoTestimonialsCarouselProps) {
  const total = testimonials.length
  const statusId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<MuxMediaElement | null>(null)
  const pointerStartX = useRef<number | null>(null)

  const [activeIndex, setActiveIndex] = useState(0)
  const [navDirection, setNavDirection] =
    useState<TestimonialNavDirection>("next")
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [sectionVisible, setSectionVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [manualNavCooldownActive, setManualNavCooldownActive] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const active = testimonials[activeIndex] ?? testimonials[0]
  const canStream = Boolean(active?.muxPlaybackId)

  const goTo = useCallback(
    (
      index: number,
      options?: { manual?: boolean; direction?: TestimonialNavDirection }
    ) => {
      if (total <= 0) return
      const next = ((index % total) + total) % total
      const direction =
        options?.direction ??
        resolveTestimonialNavDirection(activeIndex, next, total)
      setNavDirection(direction)
      setActiveIndex(next)
      setAutoplayBlocked(false)
      setPlaying(false)
      if (options?.manual) {
        setManualNavCooldownActive(true)
      }
    },
    [activeIndex, total]
  )

  const goNext = useCallback(
    (manual = true) => {
      goTo(nextTestimonialIndex(activeIndex, total), {
        manual,
        direction: "next",
      })
    },
    [activeIndex, goTo, total]
  )

  const goPrevious = useCallback(
    (manual = true) => {
      goTo(previousTestimonialIndex(activeIndex, total), {
        manual,
        direction: "previous",
      })
    },
    [activeIndex, goTo, total]
  )

  const onRotateTick = useEffectEvent(() => {
    if (
      !shouldAutoRotateTestimonials({
        sectionVisible,
        pageVisible,
        muted,
        hovering,
        focused,
        manualNavCooldownActive,
        reducedMotion,
        modalOpen: false,
      })
    ) {
      return
    }
    goTo(nextTestimonialIndex(activeIndex, total), {
      manual: false,
      direction: "next",
    })
  })

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      setPageVisible(document.visibilityState === "visible")
    }
    onVisibility()
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    const node = rootRef.current
    if (!node || typeof IntersectionObserver === "undefined") {
      setSectionVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setSectionVisible(Boolean(entry?.isIntersecting))
      },
      { threshold: 0.35 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!manualNavCooldownActive) return
    const timer = window.setTimeout(() => {
      setManualNavCooldownActive(false)
    }, TESTIMONIAL_MANUAL_NAV_COOLDOWN_MS)
    return () => window.clearTimeout(timer)
  }, [manualNavCooldownActive, activeIndex])

  useEffect(() => {
    if (
      !shouldAutoRotateTestimonials({
        sectionVisible,
        pageVisible,
        muted,
        hovering,
        focused,
        manualNavCooldownActive,
        reducedMotion,
        modalOpen: false,
      })
    ) {
      return
    }
    const timer = window.setInterval(() => {
      onRotateTick()
    }, TESTIMONIAL_ROTATION_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [
    sectionVisible,
    pageVisible,
    muted,
    hovering,
    focused,
    manualNavCooldownActive,
    reducedMotion,
    activeIndex,
    total,
  ])

  useEffect(() => {
    const el = playerRef.current
    if (!el) return

    const wantPlay = shouldPlayActiveTestimonial({
      isActive: true,
      sectionVisible,
      pageVisible,
      autoplayBlocked,
    })

    if (!wantPlay || !canStream) {
      el.pause?.()
      return
    }

    const playAttempt = el.play?.()
    if (playAttempt && typeof playAttempt.then === "function") {
      void playAttempt
        .then(() => {
          setPlaying(true)
          setAutoplayBlocked(false)
        })
        .catch(() => {
          setAutoplayBlocked(true)
          setPlaying(false)
        })
    }
  }, [
    active?.muxPlaybackId,
    activeIndex,
    autoplayBlocked,
    canStream,
    muted,
    pageVisible,
    sectionVisible,
  ])

  const toggleMute = () => {
    setMuted((value) => !value)
  }

  const togglePlayPause = () => {
    const el = playerRef.current
    if (!canStream || !el) return

    if (playing) {
      el.pause?.()
      setPlaying(false)
      return
    }

    setAutoplayBlocked(false)
    const playAttempt = el.play?.()
    if (playAttempt && typeof playAttempt.then === "function") {
      void playAttempt
        .then(() => setPlaying(true))
        .catch(() => {
          setAutoplayBlocked(true)
          setPlaying(false)
        })
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartX.current = event.clientX
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current == null) return
    const deltaX = event.clientX - pointerStartX.current
    pointerStartX.current = null
    const direction = resolveSwipeDirection(deltaX)
    if (direction === "next") goNext(true)
    if (direction === "previous") goPrevious(true)
  }

  if (total === 0 || !active) {
    return null
  }

  return (
    <Section
      id={VIDEO_TESTIMONIALS_SECTION.id}
      variant="soft"
      className={cn("overflow-x-clip", className)}
      aria-label={VIDEO_TESTIMONIALS_SECTION.title}
    >
      <div
        ref={rootRef}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocused(false)
          }
        }}
      >
        <Container className="max-w-6xl">
          <SectionHeader
            align="center"
            eyebrow={VIDEO_TESTIMONIALS_SECTION.eyebrow}
            title={VIDEO_TESTIMONIALS_SECTION.title}
            subtitle={VIDEO_TESTIMONIALS_SECTION.subtitle}
          />

          <div className="relative mt-10">
            <p id={statusId} className="sr-only" aria-live="polite">
              {paginationStatusLabel(
                activeIndex,
                total,
                resolveTestimonialDisplayName(active)
              )}
            </p>

            {/*
              Fixed-center layered stage: all visible cards are absolutely
              positioned from stage center. Horizontal offset lives in --slot-x
              so transform interpolates next→active from the right (and the
              reverse for previous). An invisible spacer preserves stage height.
            */}
            <div
              className="relative mx-auto w-full max-w-5xl overflow-x-clip px-1 sm:px-3"
              data-testid="testimonial-carousel-stage"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                pointerStartX.current = null
              }}
            >
              <div
                className="relative mx-auto flex w-full items-center justify-center"
                data-testid="testimonial-carousel-track"
                data-nav-direction={navDirection}
              >
                {/* Flow spacer: matches active card size so absolute cards have height. */}
                <div
                  aria-hidden
                  data-testid="testimonial-carousel-spacer"
                  className="invisible pointer-events-none aspect-[9/16] w-[min(100%,20rem)] shrink-0 sm:w-[19rem] md:w-[20.5rem] lg:w-[22rem]"
                />
                {testimonials.map((item, index) => {
                  const slot = resolveTestimonialCarouselSlot(
                    index,
                    activeIndex,
                    total
                  )
                  const isActive = slot === "active"
                  const isSide = slot === "previous" || slot === "next"
                  const poster = resolvePosterUrl(resolveTestimonialPoster(item))

                  if (slot === "hidden") {
                    return null
                  }

                  return (
                    <article
                      key={item.id}
                      aria-hidden={!isActive}
                      data-carousel-slot={slot}
                      data-testid={
                        isActive
                          ? "testimonial-card-active"
                          : slot === "previous"
                            ? "testimonial-card-previous"
                            : "testimonial-card-next"
                      }
                      className={cn(
                        "absolute top-1/2 left-1/2 overflow-hidden rounded-2xl border border-line bg-ink/5 shadow-sm",
                        "aspect-[9/16]",
                        slotOffsetClass(slot),
                        isActive &&
                          // Active ~320–380px (20–22rem) across breakpoints.
                          "w-[min(100%,20rem)] sm:w-[19rem] md:w-[20.5rem] lg:w-[22rem]",
                        isSide &&
                          cn(
                            "hidden sm:block",
                            // Side ~280–330px; --slot-x + translateX(-50%) centers
                            // so ~40–80px sits under the active edge.
                            "w-[15.5rem] md:w-[17.5rem] lg:w-[19rem]",
                            "cursor-pointer"
                          )
                      )}
                      style={slotVisualStyle(slot, reducedMotion)}
                      onClick={
                        isSide
                          ? () =>
                              goTo(index, {
                                manual: true,
                                direction:
                                  slot === "next" ? "next" : "previous",
                              })
                          : undefined
                      }
                      // Side previews are pointer-selectable but not tab-focusable
                      // so they never compete with active mute/play controls.
                      tabIndex={-1}
                      role={isSide ? "button" : undefined}
                      aria-label={
                        isSide
                          ? `Show testimonial ${index + 1}`
                          : undefined
                      }
                    >
                      {isActive && item.muxPlaybackId ? (
                        <div className="absolute inset-0">
                          <MuxPlayer
                            ref={playerRef as never}
                            playbackId={item.muxPlaybackId}
                            streamType="on-demand"
                            poster={poster}
                            muted={muted}
                            loop={muted}
                            playsInline
                            preload="metadata"
                            className="h-full w-full [--controls:none] [--media-object-fit:cover]"
                            style={{ width: "100%", height: "100%" }}
                            aria-label={buildSlideAccessibleName(
                              item,
                              index,
                              total
                            )}
                            onPlay={() => setPlaying(true)}
                            onPause={() => setPlaying(false)}
                          >
                            {item.captionsUrl ? (
                              <track
                                kind="captions"
                                src={item.captionsUrl}
                                srcLang="en"
                                label="English"
                              />
                            ) : null}
                          </MuxPlayer>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-soft to-cream2">
                          {poster ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Mux CDN posters; avoid next/image remote config for drafts.
                            <img
                              src={poster}
                              alt=""
                              className="absolute inset-0 size-full object-cover"
                              loading={isActive ? "eager" : "lazy"}
                              decoding="async"
                            />
                          ) : (
                            <div
                              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(47,126,150,0.28),transparent_55%),linear-gradient(160deg,#E8F3F1,#F6FAF9_45%,#DDECE8)]"
                              aria-hidden
                            />
                          )}
                          <span className="sr-only">
                            {buildSlideAccessibleName(item, index, total)}
                          </span>
                        </div>
                      )}

                      {isActive ? (
                        <div
                          className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3"
                          style={{ zIndex: TESTIMONIAL_CONTROLS_Z }}
                        >
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur-sm transition hover:bg-ink/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                              aria-label={muteControlLabel(muted)}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleMute()
                              }}
                            >
                              {muted ? (
                                <VolumeX className="size-4" aria-hidden />
                              ) : (
                                <Volume2 className="size-4" aria-hidden />
                              )}
                              <span className="sr-only">
                                {muteControlLabel(muted)}
                              </span>
                            </button>
                          </div>

                          <div className="flex items-end justify-between gap-3">
                            <div className="min-w-0 rounded-xl bg-ink/45 px-3 py-2 text-left text-white backdrop-blur-sm">
                              <p className="truncate font-display text-sm font-medium">
                                {resolveTestimonialDisplayName(item)}
                              </p>
                              {resolveTestimonialRoleContext(item) ? (
                                <p className="truncate text-xs text-white/85">
                                  {resolveTestimonialRoleContext(item)}
                                </p>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              className="pointer-events-auto inline-flex size-12 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                              aria-label={
                                autoplayBlocked && !playing
                                  ? "Play testimonial"
                                  : playPauseControlLabel(playing)
                              }
                              onClick={(event) => {
                                event.stopPropagation()
                                togglePlayPause()
                              }}
                            >
                              {playing ? (
                                <Pause className="size-5" aria-hidden />
                              ) : (
                                <Play
                                  className="size-5 translate-x-0.5"
                                  aria-hidden
                                />
                              )}
                              <span className="sr-only">
                                {playPauseControlLabel(playing)}
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </div>

            <div
              className="mt-6 flex items-center justify-center gap-4"
              data-testid="testimonial-carousel-pagination"
            >
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-cream2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                aria-label="Previous testimonial"
                onClick={() => goPrevious(true)}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>

              <div
                className="flex items-center justify-center gap-2"
                role="tablist"
                aria-label="Testimonial slides"
              >
                {testimonials.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-controls={VIDEO_TESTIMONIALS_SECTION.id}
                    aria-label={`Go to testimonial ${index + 1}`}
                    className={cn(
                      "size-2.5 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue",
                      index === activeIndex
                        ? "bg-blue"
                        : "bg-line hover:bg-ink/30"
                    )}
                    onClick={() => goTo(index, { manual: true })}
                  />
                ))}
              </div>

              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-cream2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                aria-label="Next testimonial"
                onClick={() => goNext(true)}
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        </Container>
      </div>
    </Section>
  )
}
