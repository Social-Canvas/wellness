import { HOMEPAGE_VIDEO_TESTIMONIALS } from "../data/testimonials"
import { getCarouselTestimonials } from "../utils/testimonials"
import { VideoTestimonialsCarousel } from "./video-testimonials-carousel"

/**
 * Public homepage testimonials section.
 * Renders published Mux testimonials when ready; otherwise draft placeholders
 * so layout/a11y can be verified without inventing identities or publishing
 * without consent.
 */
export function VideoTestimonialsSection({
  className,
}: {
  className?: string
}) {
  const testimonials = getCarouselTestimonials(HOMEPAGE_VIDEO_TESTIMONIALS, {
    includeDraftPlaceholders: true,
  })

  if (testimonials.length === 0) {
    return null
  }

  return (
    <VideoTestimonialsCarousel
      testimonials={testimonials}
      className={className}
    />
  )
}
