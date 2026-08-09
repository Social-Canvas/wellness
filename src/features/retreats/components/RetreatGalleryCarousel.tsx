"use client"

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { BrandImage } from "@/components/media"
import type { BrandImageAsset } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

const SWIPE_THRESHOLD_PX = 48
const TRANSITION_MS = 250

type RetreatGalleryCarouselProps = {
  label: string
  images: readonly BrandImageAsset[]
  className?: string
  sizes?: string
}

function RetreatGalleryCarousel({
  label,
  images,
  className,
  sizes = "(max-width: 767px) 100vw, 40vw",
}: RetreatGalleryCarouselProps) {
  const reactId = useId()
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const pointerStartX = useRef<number | null>(null)
  const total = images.length

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  const goTo = useCallback(
    (next: number) => {
      if (total <= 0) return
      setIndex(((next % total) + total) % total)
    },
    [total]
  )

  const goPrevious = useCallback(() => goTo(index - 1), [goTo, index])
  const goNext = useCallback(() => goTo(index + 1), [goTo, index])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      goPrevious()
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      goNext()
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    pointerStartX.current = event.clientX
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current == null) return
    const deltaX = event.clientX - pointerStartX.current
    pointerStartX.current = null
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return
    if (deltaX < 0) goNext()
    else goPrevious()
  }

  const onPointerCancel = () => {
    pointerStartX.current = null
  }

  if (total === 0) {
    return (
      <div
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-cream via-green-soft/50 to-green/20",
          className
        )}
        aria-hidden
      />
    )
  }

  const active = images[index] ?? images[0]
  const showControls = total > 1

  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden touch-pan-y",
        className
      )}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} photo gallery`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="absolute inset-0" aria-live="polite">
        {images.map((image, imageIndex) => {
          const isActive = imageIndex === index
          return (
            <div
              key={`${reactId}-${image.src}`}
              className={cn(
                "absolute inset-0",
                !reducedMotion && "transition-opacity ease-out",
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              )}
              style={
                reducedMotion
                  ? undefined
                  : { transitionDuration: `${TRANSITION_MS}ms` }
              }
              aria-hidden={!isActive}
            >
              <BrandImage
                image={image}
                priority={imageIndex === 0}
                sizes={sizes}
                containerClassName="absolute inset-0 h-full w-full"
              />
            </div>
          )
        })}
      </div>

      <span className="sr-only">
        {`Image ${index + 1} of ${total}: ${active.alt}`}
      </span>

      {showControls ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-ink/35 text-white backdrop-blur-[2px] transition-opacity hover:bg-ink/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-[768px]:opacity-80"
            aria-label={`Previous ${label} photo`}
            onClick={goPrevious}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-ink/35 text-white backdrop-blur-[2px] transition-opacity hover:bg-ink/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-[768px]:opacity-80"
            aria-label={`Next ${label} photo`}
            onClick={goNext}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <div
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5"
            role="tablist"
            aria-label={`${label} gallery slides`}
          >
            {images.map((image, dotIndex) => {
              const selected = dotIndex === index
              return (
                <button
                  key={`${reactId}-dot-${image.src}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={`${label} photo ${dotIndex + 1} of ${total}`}
                  className={cn(
                    "size-2 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                    selected ? "bg-white" : "bg-white/45 hover:bg-white/70"
                  )}
                  onClick={() => goTo(dotIndex)}
                />
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}

export { RetreatGalleryCarousel, type RetreatGalleryCarouselProps }
